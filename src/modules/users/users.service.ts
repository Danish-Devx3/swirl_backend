import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService, CACHE_TTL } from '../../common/cache/cache.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) { }

  async findById(id: string) {
    // Try cache first
    const cacheKey = `user:${id}:profile`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    // Fetch from database
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        addresses: true,
        _count: {
          select: {
            cartItems: true,
            wishlistItems: true,
            orders: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Cache for 5 minutes
    await this.cache.set(cacheKey, user, CACHE_TTL.USER_PROFILE);

    return user;
  }

  async updateProfile(userId: string, data: { name?: string; avatar?: string; email?: string; phone?: string }) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
    });

    // Invalidate cache
    await this.cache.invalidate(`user:${userId}:profile`);

    return updated;
  }
}

