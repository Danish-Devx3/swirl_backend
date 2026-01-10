import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService, CACHE_TTL } from '../../common/cache/cache.service';
import { EventsService } from '../../common/events/events.service';
import { WishlistItemStatus, InteractionType } from '@prisma/client';

@Injectable()
export class WishlistService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
    private events: EventsService,
  ) {}

  async getWishlist(userId: string) {
    // Try cache first
    const cacheKey = `user:${userId}:wishlist`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    // Fetch from database
    const wishlistItems = await this.prisma.wishlistItem.findMany({
      where: {
        userId,
        status: WishlistItemStatus.ACTIVE,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Cache for 5 minutes
    await this.cache.set(cacheKey, wishlistItems, CACHE_TTL.WISHLIST);

    return wishlistItems;
  }

  async addToWishlist(userId: string, itemId: number) {
    // Check if already in wishlist
    const existing = await this.prisma.wishlistItem.findFirst({
      where: {
        userId,
        itemId,
        status: WishlistItemStatus.ACTIVE,
      },
    });

    if (existing) {
      return existing;
    }

    const wishlistItem = await this.prisma.wishlistItem.create({
      data: {
        userId,
        itemId,
        status: WishlistItemStatus.ACTIVE,
      },
    });

    // Record interaction for ML training
    await this.recordInteraction(userId, itemId, InteractionType.WISHLIST_ADD);

    // Emit event for AI service
    await this.events.emitWishlistEvent({
      userId,
      itemId,
      action: 'add',
    });

    // Invalidate cache
    await this.cache.invalidate(`user:${userId}:wishlist`);

    return wishlistItem;
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
      // Log but don't fail wishlist operation
      console.error('Failed to record interaction:', error);
    }
  }

  async removeFromWishlist(wishlistItemId: string, userId: string) {
    const item = await this.prisma.wishlistItem.findFirst({
      where: { id: wishlistItemId, userId },
    });

    if (!item) {
      throw new NotFoundException('Wishlist item not found');
    }

    const updated = await this.prisma.wishlistItem.update({
      where: { id: wishlistItemId },
      data: { status: WishlistItemStatus.REMOVED },
    });

    // Emit event
    await this.events.emitWishlistEvent({
      userId,
      itemId: item.itemId,
      action: 'remove',
    });

    // Invalidate cache
    await this.cache.invalidate(`user:${userId}:wishlist`);

    return updated;
  }
}
