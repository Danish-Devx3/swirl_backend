import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    it('should return user with counts if found', async () => {
      const userId = 'user-id';
      const user = {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
        addresses: [],
        _count: {
          cartItems: 5,
          wishlistItems: 3,
          orders: 2,
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user);

      const result = await service.findById(userId);

      expect(result).toEqual(user);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
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
    });

    it('should throw NotFoundException if user not found', async () => {
      const userId = 'non-existent';
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findById(userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const userId = 'user-id';
      const updateData = {
        name: 'Updated Name',
        avatar: 'https://example.com/avatar.jpg',
      };
      const updatedUser = {
        id: userId,
        ...updateData,
      };

      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateProfile(userId, updateData);

      expect(result).toEqual(updatedUser);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: updateData,
      });
    });

    it('should update only provided fields', async () => {
      const userId = 'user-id';
      const updateData = { name: 'New Name' };
      const updatedUser = {
        id: userId,
        name: 'New Name',
      };

      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateProfile(userId, updateData);

      expect(result).toEqual(updatedUser);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: updateData,
      });
    });
  });
});

