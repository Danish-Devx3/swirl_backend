import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface ProductDetails {
    id: number;
    name: string;
    price: number;
    image: string;
    stock: number;
    category: string;
}

@Injectable()
export class ProductService {
    constructor(private prisma: PrismaService) { }

    async getProductById(id: number): Promise<ProductDetails> {
        const product = await this.prisma.product.findUnique({
            where: { id },
        });

        if (!product) {
            throw new NotFoundException(`Product with ID ${id} not found`);
        }

        return {
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image || '',
            stock: product.stock,
            category: product.category || 'Uncategorized',
        };
    }

    async checkStock(id: number, quantity: number): Promise<boolean> {
        const product = await this.prisma.product.findUnique({
            where: { id },
            select: { stock: true },
        });

        if (!product) return false;
        return product.stock >= quantity;
    }

    async getProductsByIds(ids: number[]): Promise<ProductDetails[]> {
        const products = await this.prisma.product.findMany({
            where: {
                id: { in: ids },
            },
        });

        return products.map((product) => ({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image || '',
            stock: product.stock,
            category: product.category || 'Uncategorized',
        }));
    }
}
