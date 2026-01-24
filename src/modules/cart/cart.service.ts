import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService, CACHE_TTL } from '../../common/cache/cache.service';
import { EventsService } from '../../common/events/events.service';
import { CartItemStatus, InteractionType } from '@prisma/client';
import { ProductService } from './product.service';

@Injectable()
export class CartService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
    private events: EventsService,
    private productService: ProductService,
  ) { }

  async getCart(userId: string) {
    // Try cache first
    const cacheKey = `user:${userId}:cart`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    // Fetch from database
    const cartItems = await this.prisma.cartItem.findMany({
      where: {
        userId,
        status: CartItemStatus.ACTIVE,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Enrich with real-time product data
    // We fetch fresh details every time to ensure price/stock accuracy
    const itemIds = cartItems.map((item) => item.itemId);
    const products = await this.productService.getProductsByIds(itemIds);
    const productMap = new Map(products.map((p) => [p.id, p]));

    const enrichedItems = cartItems.map((item) => {
      const product = productMap.get(item.itemId);
      return {
        ...item,
        // Override snapshot data with fresh data if available
        itemName: product?.name || item.itemName,
        itemPrice: product?.price || item.itemPrice,
        itemImage: product?.image || item.itemImage,
        // Add stock status
        inStock: product ? product.stock >= item.quantity : false,
        availableStock: product?.stock || 0,
      };
    });

    // Cache for 1 minute
    await this.cache.set(cacheKey, enrichedItems, CACHE_TTL.CART);

    return enrichedItems;
  }

  async addToCart(userId: string, itemId: number, quantity: number = 1) {
    // 1. Validate Product Existence & Stock
    const product = await this.productService.getProductById(itemId);

    // Check if item already in cart to calculate total required stock
    const existing = await this.prisma.cartItem.findFirst({
      where: {
        userId,
        itemId,
        status: CartItemStatus.ACTIVE,
      },
    });

    const currentQty = existing ? existing.quantity : 0;
    const newTotalQty = currentQty + quantity;

    if (product.stock < newTotalQty) {
      throw new BadRequestException(
        `Insufficient stock. Only ${product.stock} available.`,
      );
    }

    // 2. Add or Update
    if (existing) {
      return this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: newTotalQty },
      });
    }

    const cartItem = await this.prisma.cartItem.create({
      data: {
        userId,
        itemId,
        quantity,
        status: CartItemStatus.ACTIVE,
        // Snapshot initial data
        itemName: product.name,
        itemPrice: product.price,
        itemImage: product.image,
      },
    });

    // 3. Post-Processing
    await this.recordInteraction(userId, itemId, InteractionType.CART_ADD);

    await this.events.emitCartEvent({
      userId,
      itemId,
      action: 'add',
      quantity,
    });

    await this.cache.invalidate(`user:${userId}:cart`);

    return cartItem;
  }

  private async recordInteraction(
    userId: string,
    itemId: number,
    type: InteractionType,
  ) {
    try {
      await this.prisma.userInteraction.create({
        data: {
          userId,
          itemId,
          interactionType: type,
          syncedToAI: false,
        },
      });
    } catch (error) {
      console.error('Failed to record interaction:', error);
    }
  }

  async updateQuantity(cartItemId: string, userId: string, quantity: number) {
    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than 0');
    }

    const item = await this.prisma.cartItem.findFirst({
      where: { id: cartItemId, userId },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    // Validate Stock
    const hasStock = await this.productService.checkStock(item.itemId, quantity);
    if (!hasStock) {
      throw new BadRequestException('Requested quantity exceeds available stock');
    }

    return this.prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity },
    });
  }

  async removeFromCart(cartItemId: string, userId: string) {
    const item = await this.prisma.cartItem.findFirst({
      where: { id: cartItemId, userId },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    const deleted = await this.prisma.cartItem.delete({
      where: { id: cartItemId },
    });

    await this.events.emitCartEvent({
      userId,
      itemId: item.itemId,
      action: 'remove',
    });

    await this.cache.invalidate(`user:${userId}:cart`);

    return deleted;
  }

  async clearCart(userId: string) {
    const result = await this.prisma.cartItem.deleteMany({
      where: { userId, status: CartItemStatus.ACTIVE },
    });

    await this.cache.invalidate(`user:${userId}:cart`);

    return result;
  }
}
