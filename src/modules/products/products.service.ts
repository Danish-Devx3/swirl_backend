import { Injectable } from '@nestjs/common';

@Injectable()
export class ProductsService {
  private readonly mockProducts = [
    { "id": 1, "primary_color": "olive", "size_range": "XL", "category": "accessories", "subcategory": "skirt", "gender": "men", "sleeve_length": "cap", "fit_type": "slim", "style": "party", "length": "long", "price_range": "luxury", "image_url": "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=800", "hasAllAttributes": true },
    { "id": 2, "primary_color": "olive", "size_range": "3XL", "category": "footwear", "subcategory": "skirt", "gender": "women", "sleeve_length": "sleeveless", "fit_type": "bodycon", "style": "sporty", "length": "regular", "price_range": "mid-range", "image_url": "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=800", "hasAllAttributes": true },
    { "id": 3, "primary_color": "purple", "size_range": "S", "category": "innerwear", "subcategory": "blouse", "gender": "women", "sleeve_length": "short", "fit_type": "loose", "style": "formal", "length": "regular", "price_range": "mid-range", "image_url": "https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?auto=format&fit=crop&q=80&w=800", "hasAllAttributes": true },
    { "id": 4, "primary_color": "yellow", "size_range": "XXL", "category": "dress", "subcategory": "dress", "gender": "men", "sleeve_length": "long", "fit_type": "relaxed", "style": "bohemian", "length": "long", "price_range": "budget", "image_url": "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&q=80&w=800", "hasAllAttributes": true },
    { "id": 5, "primary_color": "navy", "size_range": "M", "category": "top", "subcategory": "hoodie", "gender": "women", "sleeve_length": "midi", "fit_type": "relaxed", "style": "party", "length": "maxi", "price_range": "premium", "image_url": "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&q=80&w=800", "hasAllAttributes": true },
    { "id": 6, "primary_color": "red", "size_range": "3XL", "category": "top", "subcategory": "shirt", "gender": "men", "sleeve_length": "sleeveless", "fit_type": "regular", "style": "party", "length": "midi", "price_range": "luxury", "image_url": "https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?auto=format&fit=crop&q=80&w=800", "hasAllAttributes": true },
    { "id": 7, "primary_color": "orange", "size_range": "5XL", "category": "footwear", "subcategory": "trouser", "gender": "women", "sleeve_length": "midi", "fit_type": "slim", "style": "formal", "length": "cropped", "price_range": "mid-range", "image_url": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=800", "hasAllAttributes": true },
    { "id": 8, "primary_color": "black", "size_range": "S", "category": "footwear", "subcategory": "trouser", "gender": "men", "sleeve_length": "short", "fit_type": "loose", "style": "bohemian", "length": "midi", "price_range": "mid-range", "image_url": "https://images.unsplash.com/photo-1598033129183-c4f50c717658?auto=format&fit=crop&q=80&w=800", "hasAllAttributes": true },
    { "id": 9, "primary_color": "charcoal", "size_range": "5XL", "category": "innerwear", "subcategory": "top", "gender": "men", "sleeve_length": "full-length", "fit_type": "bodycon", "style": "formal", "length": "long", "price_range": "premium", "image_url": "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=800", "hasAllAttributes": true },
    { "id": 10, "primary_color": "green", "size_range": "M", "category": "dress", "subcategory": "jeans", "gender": "women", "sleeve_length": "elbow-length", "fit_type": "bodycon", "style": "formal", "length": "cropped", "price_range": "mid-range", "image_url": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=800", "hasAllAttributes": true },
    { "id": 11, "primary_color": "beige", "size_range": "XS-XXL", "category": "dress", "subcategory": "top", "gender": "men", "sleeve_length": "three-quarter", "fit_type": "bodycon", "style": "casual", "length": "cropped", "price_range": "budget", "image_url": "https://images.unsplash.com/photo-1509631179647-03f73c4fd421?auto=format&fit=crop&q=80&w=800", "hasAllAttributes": true },
    { "id": 12, "primary_color": "purple", "size_range": "S", "category": "top", "subcategory": "top", "gender": "women", "sleeve_length": "sleeveless", "fit_type": "skinny", "style": "casual", "length": "mini", "price_range": "budget", "image_url": "https://images.unsplash.com/photo-1598033129183-c4f50c717658?auto=format&fit=crop&q=80&w=800", "hasAllAttributes": true },
    { "id": 13, "primary_color": "olive", "size_range": "XS-XXL", "category": "dress", "subcategory": "skirt", "gender": "men", "sleeve_length": "midi", "fit_type": "slim", "style": "formal", "length": "regular", "price_range": "luxury", "image_url": "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=800", "hasAllAttributes": true },
    { "id": 14, "primary_color": "coral", "size_range": "XS-5XL", "category": "footwear", "subcategory": "skirt", "gender": "men", "sleeve_length": "full-length", "fit_type": "bodycon", "style": "casual", "length": "midi", "price_range": "budget", "image_url": "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=800", "hasAllAttributes": true },
    { "id": 15, "primary_color": "black", "size_range": "S", "category": "innerwear", "subcategory": "skirt", "gender": "women", "sleeve_length": "elbow-length", "fit_type": "loose", "style": "sporty", "length": "regular", "price_range": "budget", "image_url": "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=800", "hasAllAttributes": true },
    { "id": 16, "primary_color": "white", "size_range": "XL", "category": "bottom", "subcategory": "dress", "gender": "women", "sleeve_length": "null", "fit_type": "regular", "style": "bohemian", "length": "cropped", "price_range": "mid-range", "image_url": "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=800", "hasAllAttributes": true },
    { "id": 17, "primary_color": "lavender", "size_range": "tall", "category": "accessories", "subcategory": "blouse", "gender": "women", "sleeve_length": "sleeveless", "fit_type": "straight", "style": "casual", "length": "regular", "price_range": "luxury", "image_url": "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=800", "hasAllAttributes": true },
    { "id": 18, "primary_color": "teal", "size_range": "petite", "category": "top", "subcategory": "skirt", "gender": "men", "sleeve_length": "elbow-length", "fit_type": "straight", "style": "party", "length": "long", "price_range": "mid-range", "image_url": "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=800", "hasAllAttributes": true },
    { "id": 19, "primary_color": "yellow", "size_range": "4XL", "category": "innerwear", "subcategory": "blouse", "gender": "men", "sleeve_length": "elbow-length", "fit_type": "regular", "style": "formal", "length": "floor-length", "price_range": "budget", "image_url": "https://images.unsplash.com/photo-1539008835657-9e8e9680c956?auto=format&fit=crop&q=80&w=800", "hasAllAttributes": true },
    { "id": 20, "primary_color": "navy", "size_range": "L", "category": "footwear", "subcategory": "jacket", "gender": "men", "sleeve_length": "midi", "fit_type": "skinny", "style": "casual", "length": "long", "price_range": "mid-range", "image_url": "https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&q=80&w=800", "hasAllAttributes": true }
  ];

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
}
