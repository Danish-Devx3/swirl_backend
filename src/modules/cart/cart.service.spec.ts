import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CartService } from './cart.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CartItemStatus, InteractionType } from '@prisma/client';

describe('CartService', () => {
  let service: CartService;
  let prisma: PrismaService;

  const mockPrismaService = {
    cartItem: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    userInteraction: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCart', () => {
    it('should return active cart items for user', async () => {
      const userId = 'user-id';
      const cartItems = [
        {
          id: 'cart-1',
          userId,
          itemId: 1,
          quantity: 2,
          status: CartItemStatus.ACTIVE,
        },
        {
          id: 'cart-2',
          userId,
          itemId: 2,
          quantity: 1,
          status: CartItemStatus.ACTIVE,
        },
      ];

      mockPrismaService.cartItem.findMany.mockResolvedValue(cartItems);

      const result = await service.getCart(userId);

      expect(result).toEqual(cartItems);
      expect(mockPrismaService.cartItem.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          status: CartItemStatus.ACTIVE,
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('addToCart', () => {
    it('should add new item to cart', async () => {
      const userId = 'user-id';
      const itemId = 1;
      const quantity = 1;

      mockPrismaService.cartItem.findFirst.mockResolvedValue(null);
      mockPrismaService.cartItem.create.mockResolvedValue({
        id: 'cart-1',
        userId,
        itemId,
        quantity,
        status: CartItemStatus.ACTIVE,
      });
      mockPrismaService.userInteraction.create.mockResolvedValue({});

      const result = await service.addToCart(userId, itemId, quantity);

      expect(result).toHaveProperty('id', 'cart-1');
      expect(mockPrismaService.cartItem.create).toHaveBeenCalled();
      expect(mockPrismaService.userInteraction.create).toHaveBeenCalledWith({
        data: {
          userId,
          itemId,
          interactionType: InteractionType.CART_ADD,
          syncedToAI: false,
        },
      });
    });

    it('should update quantity if item already in cart', async () => {
      const userId = 'user-id';
      const itemId = 1;
      const existingItem = {
        id: 'cart-1',
        userId,
        itemId,
        quantity: 2,
        status: CartItemStatus.ACTIVE,
      };

      mockPrismaService.cartItem.findFirst.mockResolvedValue(existingItem);
      mockPrismaService.cartItem.update.mockResolvedValue({
        ...existingItem,
        quantity: 3,
      });

      const result = await service.addToCart(userId, itemId, 1);

      expect(result.quantity).toBe(3);
      expect(mockPrismaService.cartItem.update).toHaveBeenCalledWith({
        where: { id: existingItem.id },
        data: { quantity: 3 },
      });
    });
  });

  describe('updateQuantity', () => {
    it('should update cart item quantity', async () => {
      const cartItemId = 'cart-1';
      const userId = 'user-id';
      const newQuantity = 5;
      const existingItem = {
        id: cartItemId,
        userId,
        quantity: 2,
      };

      mockPrismaService.cartItem.findFirst.mockResolvedValue(existingItem);
      mockPrismaService.cartItem.update.mockResolvedValue({
        ...existingItem,
        quantity: newQuantity,
      });

      const result = await service.updateQuantity(cartItemId, userId, newQuantity);

      expect(result.quantity).toBe(newQuantity);
    });

    it('should throw BadRequestException if quantity is 0 or negative', async () => {
      const cartItemId = 'cart-1';
      const userId = 'user-id';

      await expect(
        service.updateQuantity(cartItemId, userId, 0),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.updateQuantity(cartItemId, userId, -1),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if cart item not found', async () => {
      const cartItemId = 'non-existent';
      const userId = 'user-id';

      mockPrismaService.cartItem.findFirst.mockResolvedValue(null);

      await expect(
        service.updateQuantity(cartItemId, userId, 5),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeFromCart', () => {
    it('should mark cart item as removed', async () => {
      const cartItemId = 'cart-1';
      const userId = 'user-id';
      const existingItem = {
        id: cartItemId,
        userId,
        status: CartItemStatus.ACTIVE,
      };

      mockPrismaService.cartItem.findFirst.mockResolvedValue(existingItem);
      mockPrismaService.cartItem.update.mockResolvedValue({
        ...existingItem,
        status: CartItemStatus.REMOVED,
      });

      const result = await service.removeFromCart(cartItemId, userId);

      expect(result.status).toBe(CartItemStatus.REMOVED);
    });

    it('should throw NotFoundException if cart item not found', async () => {
      const cartItemId = 'non-existent';
      const userId = 'user-id';

      mockPrismaService.cartItem.findFirst.mockResolvedValue(null);

      await expect(
        service.removeFromCart(cartItemId, userId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('clearCart', () => {
    it('should mark all active cart items as removed', async () => {
      const userId = 'user-id';

      mockPrismaService.cartItem.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.clearCart(userId);

      expect(mockPrismaService.cartItem.updateMany).toHaveBeenCalledWith({
        where: { userId, status: CartItemStatus.ACTIVE },
        data: { status: CartItemStatus.REMOVED },
      });
    });
  });
});

