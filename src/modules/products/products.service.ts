import { Injectable } from '@nestjs/common';
import { MOCK_PRODUCTS } from './data/products.data';

@Injectable()
export class ProductsService {
  private readonly mockProducts = MOCK_PRODUCTS;

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
