import { Injectable, NotFoundException } from '@nestjs/common';
import productsData from './data/products.json';
import { PreferencesService } from '../preferences/preferences.service';

@Injectable()
export class ProductsService {
  private readonly mockProducts = productsData;

  constructor(private readonly preferencesService: PreferencesService) { }

  findAll(page: number = 1, limit: number = 10) {
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const paginatedProducts = this.mockProducts.slice(startIndex, endIndex);

    return {
      data: paginatedProducts,
      meta: {
        total: this.mockProducts.length,
        page,
        limit,
        totalPages: Math.ceil(this.mockProducts.length / limit),
      }
    };
  }

  search(query: string, page: number = 1, limit: number = 10) {
    const lowerQuery = query.toLowerCase();
    const filteredProducts = this.mockProducts.filter(product =>
      (product.name && product.name.toLowerCase().includes(lowerQuery)) ||
      (product.brand && product.brand.toLowerCase().includes(lowerQuery)) ||
      (product.category && product.category.toLowerCase().includes(lowerQuery)) ||
      (product.subcategory && product.subcategory.toLowerCase().includes(lowerQuery))
    );

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

    return {
      data: paginatedProducts,
      meta: {
        total: filteredProducts.length,
        page,
        limit,
        totalPages: Math.ceil(filteredProducts.length / limit),
      }
    };
  }

  async saveShopperProfile(userId: string, profile: UserPreferences) {
    // Save as a single preference object or split? 
    // Let's save as 'shopper_profile'
    return this.preferencesService.setPreference(userId, 'shopper_profile', profile);
  }

  async getShopperProfile(userId: string): Promise<UserPreferences | null> {
    const pref = await this.preferencesService.getPreference(userId, 'shopper_profile');
    if (!pref) return null;
    return (pref as any).preferenceValue as UserPreferences;
  }

  async recommendProducts(profileOrUserId: UserPreferences | string) {
    let profile: UserPreferences;

    if (typeof profileOrUserId === 'string') {
      // It's a userId, fetch profile
      const savedProfile = await this.getShopperProfile(profileOrUserId);
      if (!savedProfile) {
        throw new NotFoundException('Shopper profile not found for this user. Please create one first.');
      }
      profile = savedProfile;
    } else {
      profile = profileOrUserId;
    }

    const { likes, dislikes, size, gender } = profile;

    // 1. Filter by Gender and Size
    let filtered = this.mockProducts.filter(product => {
      // Gender check (case insensitive)
      if (product.gender && product.gender.toLowerCase() !== gender.toLowerCase()) {
        return false;
      }

      // Size check
      const sizeAvailability = product.attributes_json?.size_availability;
      if (Array.isArray(sizeAvailability)) {
        const hasSize = sizeAvailability.some(s =>
          s.size === size && s.available === true
        );
        if (!hasSize) return false;
      } else {
        // If no size info, kept safest to exclude or include? 
        // Prompt says "Filter ... to only include products that match".
        // If data is missing, we assume no match or check strictness. 
        // Let's assume strict match required.
        return false;
      }

      // Dislikes attributes check (Style, Category, Color, etc.)
      // We check if any value in the product matches a dislike
      const productValues = [
        product.style,
        product.category,
        product.subcategory,
        product.primary_color,
        product.brand
      ].filter(Boolean).map(v => v.toLowerCase());

      const hasDislike = dislikes.some(dislike =>
        productValues.some(val => val.includes(dislike.toLowerCase()))
      );

      if (hasDislike) return false;

      return true;
    });

    // 2. Score and Rank
    const scoredProducts = filtered.map(product => {
      let score = 0;
      let reasons: string[] = [];

      // Extract product attributes for matching
      const productAttributes = {
        style: product.style || "",
        category: product.category || "",
        subcategory: product.subcategory || "",
        color: product.primary_color || "",
        brand: product.brand || ""
      };

      // Scoring logic
      likes.forEach(like => {
        const likeLower = like.toLowerCase();

        // Style Match (High Priority)
        if (productAttributes.style.toLowerCase().includes(likeLower)) {
          score += 30;
          reasons.push(`Matches style preference: ${productAttributes.style}`);
        }

        // Color Match (High Priority)
        if (productAttributes.color.toLowerCase().includes(likeLower)) {
          score += 25;
          reasons.push(`Matches color preference: ${productAttributes.color}`);
        }

        // Category/Subcategory Match (Medium Priority)
        if (productAttributes.category.toLowerCase().includes(likeLower) ||
          productAttributes.subcategory.toLowerCase().includes(likeLower)) {
          score += 15;
          reasons.push(`Matches category preference`);
        }

        // Brand Match
        if (productAttributes.brand.toLowerCase().includes(likeLower)) {
          score += 10;
          reasons.push(`Matches brand preference: ${productAttributes.brand}`);
        }
      });

      // Normalize score to 100 max (cap it)
      const finalScore = Math.min(score, 100);

      // We only want to return items that have SOME match score > 0, 
      // or should we return generic recommendations if no match?
      // "Rank the remaining products". We keep them all but sort.
      // However, usually recommendations should rely on matches.
      // Let's give a base score to everyone who passed the filter.

      return {
        ...product, // simple spread, in real app might map to DTO
        match_score: finalScore,
        matching_reason: reasons.length > 0 ? reasons.join(", ") : "Fits your size and gender filters"
      };
    });

    // Sort by score descending
    scoredProducts.sort((a, b) => b.match_score - a.match_score);

    // Return top 10
    return scoredProducts.slice(0, 10).map(p => ({
      id: p._id,
      name: p.name,
      brand: p.brand,
      price: p.price,
      image_url: p.image_url,
      match_score: p.match_score,
      reason: p.matching_reason
    }));
  }
}

export interface UserPreferences {
  likes: string[];
  dislikes: string[];
  size: string;
  gender: string;
}
