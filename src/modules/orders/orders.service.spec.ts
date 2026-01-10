import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CartItemStatus, InteractionType } from '@prisma/client';

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: PrismaService;

  const mockPrismaService = {
    cartItem: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    address: {
      findFirst: jest.fn(),
    },
    order: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    userInteraction: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createOrder', () => {
    it('should create order from cart items', async () => {
      const userId = 'user-id';
      const cartItemIds = ['cart-1', 'cart-2'];
      const shippingAddressId = 'address-1';

      const cartItems = [
        {
          id: 'cart-1',
          userId,
          itemId: 1,
          quantity: 2,
          itemPrice: 50,
          itemName: 'Item 1',
          status: CartItemStatus.ACTIVE,
        },
        {
          id: 'cart-2',
          userId,
          itemId: 2,
          quantity: 1,
          itemPrice: 30,
          itemName: 'Item 2',
          status: CartItemStatus.ACTIVE,
        },
      ];

      const address = {
        id: shippingAddressId,
        userId,
        fullName: 'John Doe',
        phone: '1234567890',
        addressLine1: '123 Main St',
        addressLine2: 'Apt 4',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'USA',
      };

      const order = {
        id: 'order-1',
        userId,
        orderNumber: 'ORD-123',
        status: 'PENDING',
        totalAmount: 130,
      };

      mockPrismaService.cartItem.findMany.mockResolvedValue(cartItems);
      mockPrismaService.address.findFirst.mockResolvedValue(address);
      mockPrismaService.order.create.mockResolvedValue(order);
      mockPrismaService.cartItem.updateMany.mockResolvedValue({ count: 2 });
      mockPrismaService.userInteraction.create.mockResolvedValue({});

      const result = await service.createOrder(
        userId,
        cartItemIds,
        shippingAddressId,
      );

      expect(result).toEqual(order);
      expect(mockPrismaService.order.create).toHaveBeenCalled();
      expect(mockPrismaService.cartItem.updateMany).toHaveBeenCalledWith({
        where: { id: { in: cartItemIds } },
        data: { status: CartItemStatus.PURCHASED },
      });
    });

    it('should throw BadRequestException if no cart items found', async () => {
      const userId = 'user-id';
      const cartItemIds = ['cart-1'];
      const shippingAddressId = 'address-1';

      mockPrismaService.cartItem.findMany.mockResolvedValue([]);

      await expect(
        service.createOrder(userId, cartItemIds, shippingAddressId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if address not found', async () => {
      const userId = 'user-id';
      const cartItemIds = ['cart-1'];
      const shippingAddressId = 'address-1';

      const cartItems = [
        {
          id: 'cart-1',
          userId,
          itemId: 1,
          quantity: 1,
          itemPrice: 50,
          status: CartItemStatus.ACTIVE,
        },
      ];

      mockPrismaService.cartItem.findMany.mockResolvedValue(cartItems);
      mockPrismaService.address.findFirst.mockResolvedValue(null);

      await expect(
        service.createOrder(userId, cartItemIds, shippingAddressId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getOrders', () => {
    it('should return all orders for user', async () => {
      const userId = 'user-id';
      const orders = [
        {
          id: 'order-1',
          userId,
          orderNumber: 'ORD-1',
          status: 'PENDING',
        },
        {
          id: 'order-2',
          userId,
          orderNumber: 'ORD-2',
          status: 'COMPLETED',
        },
      ];

      mockPrismaService.order.findMany.mockResolvedValue(orders);

      const result = await service.getOrders(userId);

      expect(result).toEqual(orders);
      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getOrderById', () => {
    it('should return order if found', async () => {
      const orderId = 'order-1';
      const userId = 'user-id';
      const order = {
        id: orderId,
        userId,
        orderNumber: 'ORD-1',
        status: 'PENDING',
      };

      mockPrismaService.order.findFirst.mockResolvedValue(order);

      const result = await service.getOrderById(orderId, userId);

      expect(result).toEqual(order);
    });

    it('should throw NotFoundException if order not found', async () => {
      const orderId = 'non-existent';
      const userId = 'user-id';

      mockPrismaService.order.findFirst.mockResolvedValue(null);

      await expect(
        service.getOrderById(orderId, userId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

