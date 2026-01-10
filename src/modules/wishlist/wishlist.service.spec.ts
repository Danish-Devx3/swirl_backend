import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WishlistItemStatus, InteractionType } from '@prisma/client';

describe('WishlistService', () => {
  let service: WishlistService;
  let prisma: PrismaService;

  const mockPrismaService = {
    wishlistItem: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    userInteraction: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WishlistService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<WishlistService>(WishlistService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getWishlist', () => {
    it('should return active wishlist items for user', async () => {
      const userId = 'user-id';
      const wishlistItems = [
        {
          id: 'wish-1',
          userId,
          itemId: 1,
          status: WishlistItemStatus.ACTIVE,
        },
        {
          id: 'wish-2',
          userId,
          itemId: 2,
          status: WishlistItemStatus.ACTIVE,
        },
      ];

      mockPrismaService.wishlistItem.findMany.mockResolvedValue(wishlistItems);

      const result = await service.getWishlist(userId);

      expect(result).toEqual(wishlistItems);
      expect(mockPrismaService.wishlistItem.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          status: WishlistItemStatus.ACTIVE,
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('addToWishlist', () => {
    it('should add new item to wishlist', async () => {
      const userId = 'user-id';
      const itemId = 1;

      mockPrismaService.wishlistItem.findFirst.mockResolvedValue(null);
      mockPrismaService.wishlistItem.create.mockResolvedValue({
        id: 'wish-1',
        userId,
        itemId,
        status: WishlistItemStatus.ACTIVE,
      });
      mockPrismaService.userInteraction.create.mockResolvedValue({});

      const result = await service.addToWishlist(userId, itemId);

      expect(result).toHaveProperty('id', 'wish-1');
      expect(mockPrismaService.wishlistItem.create).toHaveBeenCalled();
      expect(mockPrismaService.userInteraction.create).toHaveBeenCalledWith({
        data: {
          userId,
          itemId,
          interactionType: InteractionType.WISHLIST_ADD,
          syncedToAI: false,
        },
      });
    });

    it('should return existing item if already in wishlist', async () => {
      const userId = 'user-id';
      const itemId = 1;
      const existingItem = {
        id: 'wish-1',
        userId,
        itemId,
        status: WishlistItemStatus.ACTIVE,
      };

      mockPrismaService.wishlistItem.findFirst.mockResolvedValue(existingItem);

      const result = await service.addToWishlist(userId, itemId);

      expect(result).toEqual(existingItem);
      expect(mockPrismaService.wishlistItem.create).not.toHaveBeenCalled();
    });
  });

  describe('removeFromWishlist', () => {
    it('should mark wishlist item as removed', async () => {
      const wishlistItemId = 'wish-1';
      const userId = 'user-id';
      const existingItem = {
        id: wishlistItemId,
        userId,
        status: WishlistItemStatus.ACTIVE,
      };

      mockPrismaService.wishlistItem.findFirst.mockResolvedValue(existingItem);
      mockPrismaService.wishlistItem.update.mockResolvedValue({
        ...existingItem,
        status: WishlistItemStatus.REMOVED,
      });

      const result = await service.removeFromWishlist(wishlistItemId, userId);

      expect(result.status).toBe(WishlistItemStatus.REMOVED);
    });

    it('should throw NotFoundException if wishlist item not found', async () => {
      const wishlistItemId = 'non-existent';
      const userId = 'user-id';

      mockPrismaService.wishlistItem.findFirst.mockResolvedValue(null);

      await expect(
        service.removeFromWishlist(wishlistItemId, userId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

