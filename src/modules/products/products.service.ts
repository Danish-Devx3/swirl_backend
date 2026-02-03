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

  async recommendProducts(profileOrUserId: UserPreferences | string, category?: string, limit: number = 10) {
    let profile: UserPreferences;

    if (typeof profileOrUserId === 'string') {
      // It's a userId, fetch profile
      profile = await this.getShopperProfile(profileOrUserId);
    } else {
      profile = profileOrUserId;
    }

    // Graceful fallback if profile is still undefined (shouldn't happen if logic above is correct, but for safety)
    if (!profile) {
      console.warn('Profile not found, using defaults');
      profile = {
        gender: 'Men', // Default
        size: '',
        likes: [],
        dislikes: [],
        mobile: '',
        country: 'IN'
      };
    }

    const { likes, dislikes, size, gender } = profile;

    // 1. Filter by Gender and Size
    let filtered = this.mockProducts.filter(product => {
      // Gender check (case insensitive & normalized)
      if (product.gender) {
        const pGender = product.gender.toLowerCase().trim();
        const uGender = gender.toLowerCase().trim();

        const femaleKeywords = ['women', 'woman', 'female', 'girl', 'girls', 'lady', 'ladies'];
        const maleKeywords = ['men', 'man', 'male', 'boy', 'boys', 'gentleman'];

        const isProductFemale = femaleKeywords.some(k => pGender.includes(k));
        const isProductMale = maleKeywords.some(k => pGender.includes(k)) && !isProductFemale;

        // User Gender
        const isUserMale = ['men', 'male', 'boy', 'man'].some(g => uGender.includes(g)) && !uGender.includes('wo');
        const isUserFemale = ['women', 'woman', 'female', 'girl'].some(g => uGender.includes(g));

        // Filtering
        if (isUserMale && isProductFemale) return false;
        if (isUserFemale && isProductMale) return false;
      }

      // Category check (if provided)
      if (category && category !== 'All') {
        const productCategory = (product.category || '').toLowerCase();
        const productSubcategory = (product.subcategory || '').toLowerCase();
        const targetCategory = category.toLowerCase();

        // Simple inclusion check
        if (!productCategory.includes(targetCategory) && !productSubcategory.includes(targetCategory)) {
          // Special mapping for Frontend categories to Backend data
          // Relaxed: Check if any part matches, or if specific keywords are present
          const isMatch = (() => {
            if (targetCategory === 'top') return ['top', 'shirt', 't-shirt', 'jacket', 'hoodie', 'sweater', 'blazer', 'kurta'].some(c => productCategory.includes(c));
            if (targetCategory === 'bottom') return ['bottom', 'pant', 'jean', 'short', 'skirt', 'trouser', 'legging', 'jogger'].some(c => productCategory.includes(c));
            if (targetCategory === 'footwear') return ['shoe', 'sneaker', 'sandal', 'boot', 'heel', 'flat', 'flip flop'].some(c => productCategory.includes(c));
            return false;
          })();

          if (!isMatch) return false;
        }
      }

      // Size check
      if (size) {
        const sizeAvailability = product.attributes_json?.size_availability;
        if (Array.isArray(sizeAvailability)) {
          // Size Mapping Logic
          const sizeMap: Record<string, string[]> = {
            'XS': ['24', '26', 'XS'],
            'S': ['28', '29', 'S'],
            'M': ['30', '31', '32', 'M'],
            'L': ['33', '34', '35', '36', 'L'],
            'XL': ['38', '40', 'XL'],
            'XXL': ['42', '44', 'XXL']
          };

          const targetSizes = sizeMap[size.toUpperCase()] || [size];

          const hasSize = sizeAvailability.some(s =>
            targetSizes.includes(s.size) && s.available === true
          );
          if (!hasSize) return false;
        } else {
          // Strict size check: require size info if user HAS preference
          return false;
        }
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
      if (Array.isArray(likes)) {
        likes.forEach(like => {
          if (!like) return;
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
      }

      // Normalize score to 100 max (cap it)
      const finalScore = Math.min(score, 100);

      return {
        ...product,
        match_score: finalScore,
        matching_reason: reasons.length > 0 ? reasons.join(", ") : "Fits your size and gender filters"
      };
    });

    // Sort by score descending
    scoredProducts.sort((a, b) => b.match_score - a.match_score);

    // Return top N based on limit
    return scoredProducts.slice(0, limit).map(p => ({
      id: p._id,
      name: p.name,
      brand: p.brand,
      price: p.price,
      image_url: p.image_url,
      category: p.category,
      subcategory: p.subcategory,
      gender: p.gender,
      style: p.style,
      primary_color: p.primary_color,
      attributes_json: p.attributes_json,
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
  mobile?: string;
  country?: string;
}
