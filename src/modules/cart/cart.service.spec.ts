import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CartService } from './cart.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CartItemStatus, InteractionType } from '@prisma/client';
import { ProductService } from './product.service';
import { CacheService } from '../../common/cache/cache.service';
import { EventsService } from '../../common/events/events.service';

describe('CartService', () => {
  let service: CartService;
  let prisma: PrismaService;
  let productService: ProductService;

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

  const mockProductService = {
    getProductById: jest.fn(),
    checkStock: jest.fn(),
    getProductsByIds: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    invalidate: jest.fn(),
  };

  const mockEventsService = {
    emitCartEvent: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ProductService,
          useValue: mockProductService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: EventsService,
          useValue: mockEventsService,
        },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
    prisma = module.get<PrismaService>(PrismaService);
    productService = module.get<ProductService>(ProductService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCart', () => {
    it('should return enriched cart items for user', async () => {
      const userId = 'user-id';
      const cartItems = [
        {
          id: 'cart-1',
          userId,
          itemId: 1,
          quantity: 2,
          status: CartItemStatus.ACTIVE,
          itemName: 'Old Name',
          itemPrice: 10,
        },
      ];
      const products = [
        {
          id: 1,
          name: 'New Name',
          price: 20,
          image: 'img.jpg',
          stock: 100,
        },
      ];

      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.cartItem.findMany.mockResolvedValue(cartItems);
      mockProductService.getProductsByIds.mockResolvedValue(products);

      const result = await service.getCart(userId);

      expect(result[0].itemName).toBe('New Name');
      expect(result[0].itemPrice).toBe(20);
      expect(result[0].inStock).toBe(true);
      expect(result[0].availableStock).toBe(100);
      expect(mockCacheService.set).toHaveBeenCalled();
    });
  });

  describe('addToCart', () => {
    it('should add new item to cart if stock available', async () => {
      const userId = 'user-id';
      const itemId = 1;
      const quantity = 1;

      mockProductService.getProductById.mockResolvedValue({
        id: 1,
        name: 'Item',
        price: 10,
        stock: 10,
      });

      mockPrismaService.cartItem.findFirst.mockResolvedValue(null);
      mockPrismaService.cartItem.create.mockResolvedValue({
        id: 'cart-1',
        userId,
        itemId,
        quantity,
        status: CartItemStatus.ACTIVE,
      });

      const result = await service.addToCart(userId, itemId, quantity);

      expect(result).toHaveProperty('id', 'cart-1');
      expect(mockPrismaService.cartItem.create).toHaveBeenCalled();
    });

    it('should throw BadRequest if insufficient stock', async () => {
      const userId = 'user-id';
      const itemId = 1;
      const quantity = 100;

      mockProductService.getProductById.mockResolvedValue({
        id: 1,
        stock: 50, // Less than request
      });
      mockPrismaService.cartItem.findFirst.mockResolvedValue(null);

      await expect(
        service.addToCart(userId, itemId, quantity),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateQuantity', () => {
    it('should update cart item quantity if stock check passes', async () => {
      const cartItemId = 'cart-1';
      const userId = 'user-id';
      const newQuantity = 5;
      const existingItem = {
        id: cartItemId,
        userId,
        quantity: 2,
        itemId: 1,
      };

      mockPrismaService.cartItem.findFirst.mockResolvedValue(existingItem);
      mockProductService.checkStock.mockResolvedValue(true);
      mockPrismaService.cartItem.update.mockResolvedValue({
        ...existingItem,
        quantity: newQuantity,
      });

      const result = await service.updateQuantity(cartItemId, userId, newQuantity);

      expect(result.quantity).toBe(newQuantity);
    });

    it('should throw BadRequest if out of stock', async () => {
      const cartItemId = 'cart-1';
      const userId = 'user-id';

      mockPrismaService.cartItem.findFirst.mockResolvedValue({ itemId: 1 });
      mockProductService.checkStock.mockResolvedValue(false);

      await expect(
        service.updateQuantity(cartItemId, userId, 10),
      ).rejects.toThrow(BadRequestException);
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
        itemId: 1, // Add itemId for event emission
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

