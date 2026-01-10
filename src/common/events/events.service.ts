import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RabbitMQService } from './rabbitmq.service';

export interface UserInteractionEvent {
  userId: string;
  itemId?: number;
  interactionType: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

@Injectable()
export class EventsService {
  constructor(
    private eventEmitter: EventEmitter2,
    private rabbitMQ: RabbitMQService,
  ) {}

  /**
   * Emit user interaction event
   * This will:
   * 1. Emit local event (for in-process listeners)
   * 2. Publish to RabbitMQ (for AI service consumption)
   */
  async emitUserInteraction(event: UserInteractionEvent): Promise<void> {
    // Emit local event (non-blocking)
    this.eventEmitter.emit('user.interaction', event);

    // Publish to RabbitMQ for AI service
    await this.rabbitMQ.publishUserInteraction(event);
  }

  /**
   * Emit cart event
   */
  async emitCartEvent(event: {
    userId: string;
    itemId: number;
    action: 'add' | 'remove' | 'update';
    quantity?: number;
  }): Promise<void> {
    this.eventEmitter.emit('cart.event', event);
    await this.rabbitMQ.publishCartEvent(event);
  }

  /**
   * Emit wishlist event
   */
  async emitWishlistEvent(event: {
    userId: string;
    itemId: number;
    action: 'add' | 'remove';
  }): Promise<void> {
    this.eventEmitter.emit('wishlist.event', event);
    await this.rabbitMQ.publishWishlistEvent(event);
  }

  /**
   * Emit order event
   */
  async emitOrderEvent(event: {
    userId: string;
    orderId: string;
    itemIds: number[];
    totalAmount: number;
  }): Promise<void> {
    this.eventEmitter.emit('order.event', event);
    await this.rabbitMQ.publishOrderEvent(event);
  }
}

