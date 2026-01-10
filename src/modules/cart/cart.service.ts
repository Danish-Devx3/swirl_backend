import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService, CACHE_TTL } from '../../common/cache/cache.service';
import { EventsService } from '../../common/events/events.service';
import { CartItemStatus, InteractionType } from '@prisma/client';

@Injectable()
export class CartService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
    private events: EventsService,
  ) {}

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

    // Cache for 1 minute
    await this.cache.set(cacheKey, cartItems, CACHE_TTL.CART);

    return cartItems;
  }

  async addToCart(userId: string, itemId: number, quantity: number = 1) {
    // Check if item already in cart
    const existing = await this.prisma.cartItem.findFirst({
      where: {
        userId,
        itemId,
        status: CartItemStatus.ACTIVE,
      },
    });

    if (existing) {
      return this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + quantity },
      });
    }

    // TODO: Fetch item details from AI service
    // For now, create with minimal data
    const cartItem = await this.prisma.cartItem.create({
      data: {
        userId,
        itemId,
        quantity,
        status: CartItemStatus.ACTIVE,
      },
    });

    // Record interaction for ML training
    await this.recordInteraction(userId, itemId, InteractionType.CART_ADD);

    // Emit event for AI service
    await this.events.emitCartEvent({
      userId,
      itemId,
      action: 'add',
      quantity,
    });

    // Invalidate cache
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
      // Log but don't fail cart operation
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

    const updated = await this.prisma.cartItem.update({
      where: { id: cartItemId },
      data: { status: CartItemStatus.REMOVED },
    });

    // Emit event
    await this.events.emitCartEvent({
      userId,
      itemId: item.itemId,
      action: 'remove',
    });

    // Invalidate cache
    await this.cache.invalidate(`user:${userId}:cart`);

    return updated;
  }

  async clearCart(userId: string) {
    const result = await this.prisma.cartItem.updateMany({
      where: { userId, status: CartItemStatus.ACTIVE },
      data: { status: CartItemStatus.REMOVED },
    });

    // Invalidate cache
    await this.cache.invalidate(`user:${userId}:cart`);

    return result;
  }
}

