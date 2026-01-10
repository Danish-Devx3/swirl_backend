import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsService } from '../../common/events/events.service';
import { CartItemStatus, InteractionType } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private events: EventsService,
  ) {}

  async createOrder(userId: string, cartItemIds: string[], shippingAddressId: string) {
    // Get cart items
    const cartItems = await this.prisma.cartItem.findMany({
      where: {
        id: { in: cartItemIds },
        userId,
        status: CartItemStatus.ACTIVE,
      },
    });

    if (cartItems.length === 0) {
      throw new BadRequestException('No valid cart items found');
    }

    // Get shipping address
    const address = await this.prisma.address.findFirst({
      where: { id: shippingAddressId, userId },
    });

    if (!address) {
      throw new NotFoundException('Shipping address not found');
    }

    // Calculate total (mock - should fetch from AI service)
    const totalAmount = cartItems.reduce((sum, item) => {
      return sum + (item.itemPrice || 0) * item.quantity;
    }, 0);

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create order
    const order = await this.prisma.order.create({
      data: {
        userId,
        orderNumber,
        status: 'PENDING',
        totalAmount,
        shippingAddressId,
        shippingAddress: {
          fullName: address.fullName,
          phone: address.phone,
          addressLine1: address.addressLine1,
          addressLine2: address.addressLine2,
          city: address.city,
          state: address.state,
          postalCode: address.postalCode,
          country: address.country,
        },
        items: cartItems.map((item) => ({
          itemId: item.itemId,
          quantity: item.quantity,
          price: item.itemPrice || 0,
          name: item.itemName,
        })),
      },
    });

    // Mark cart items as purchased
    await this.prisma.cartItem.updateMany({
      where: { id: { in: cartItemIds } },
      data: { status: CartItemStatus.PURCHASED },
    });

    // Record order completion interactions for ML training
    for (const item of cartItems) {
      await this.recordInteraction(
        userId,
        item.itemId,
        InteractionType.ORDER_COMPLETE,
      );
    }

    // Emit order event for AI service
    await this.events.emitOrderEvent({
      userId,
      orderId: order.id,
      itemIds: cartItems.map((item) => item.itemId),
      totalAmount: totalAmount,
    });

    return order;
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
      // Log but don't fail order operation
      console.error('Failed to record interaction:', error);
    }
  }

  async getOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrderById(orderId: string, userId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }
}

