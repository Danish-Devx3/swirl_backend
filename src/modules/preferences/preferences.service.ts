import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService, CACHE_TTL } from '../../common/cache/cache.service';

@Injectable()
export class PreferencesService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  async setPreference(userId: string, preferenceType: string, preferenceValue: unknown) {
    // Convert unknown to proper JSON type for Prisma
    const jsonValue = preferenceValue as any;
    
    const preference = await this.prisma.userPreference.upsert({
      where: {
        userId_preferenceType: {
          userId,
          preferenceType,
        },
      },
      update: {
        preferenceValue: jsonValue,
      },
      create: {
        userId,
        preferenceType,
        preferenceValue: jsonValue,
      },
    });

    // Invalidate cache
    await this.cache.invalidate(`user:${userId}:preferences`);

    return preference;
  }

  async getPreference(userId: string, preferenceType: string) {
    // Try cache first
    const cacheKey = `user:${userId}:preference:${preferenceType}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    // Fetch from database
    const preference = await this.prisma.userPreference.findUnique({
      where: {
        userId_preferenceType: {
          userId,
          preferenceType,
        },
      },
    });

    // Cache for 10 minutes
    if (preference) {
      await this.cache.set(cacheKey, preference, CACHE_TTL.USER_PREFERENCES);
    }

    return preference;
  }

  async getAllPreferences(userId: string) {
    // Try cache first
    const cacheKey = `user:${userId}:preferences`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    // Fetch from database
    const preferences = await this.prisma.userPreference.findMany({
      where: { userId },
    });

    // Cache for 10 minutes
    await this.cache.set(cacheKey, preferences, CACHE_TTL.USER_PREFERENCES);

    return preferences;
  }

  async deletePreference(userId: string, preferenceType: string) {
    const deleted = await this.prisma.userPreference.delete({
      where: {
        userId_preferenceType: {
          userId,
          preferenceType,
        },
      },
    });

    // Invalidate cache
    await this.cache.invalidate(`user:${userId}:preferences`);
    await this.cache.invalidate(`user:${userId}:preference:${preferenceType}`);

    return deleted;
  }
}

