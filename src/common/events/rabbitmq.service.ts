import { Injectable, Inject, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as amqp from 'amqplib';

export interface UserInteractionEvent {
  userId: string;
  itemId?: number;
  interactionType: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private channel: amqp.Channel | null = null;
  private connection: amqp.Connection | null = null;

  // Queue names
  private readonly USER_INTERACTIONS_QUEUE = 'user_interactions';
  private readonly CART_EVENTS_QUEUE = 'cart_events';
  private readonly WISHLIST_EVENTS_QUEUE = 'wishlist_events';
  private readonly ORDER_EVENTS_QUEUE = 'order_events';

  constructor(@Inject('RABBITMQ_CONNECTION') private connectionPromise: Promise<amqp.Connection>) {}

  async onModuleInit() {
    try {
      this.connection = await this.connectionPromise;
      this.channel = await (this.connection as any).createChannel();

      // Declare queues (durable for persistence)
      await this.channel.assertQueue(this.USER_INTERACTIONS_QUEUE, { durable: true });
      await this.channel.assertQueue(this.CART_EVENTS_QUEUE, { durable: true });
      await this.channel.assertQueue(this.WISHLIST_EVENTS_QUEUE, { durable: true });
      await this.channel.assertQueue(this.ORDER_EVENTS_QUEUE, { durable: true });

      console.log('✅ RabbitMQ connected and queues declared');
    } catch (error) {
      console.error('❌ Failed to connect to RabbitMQ:', error);
      // Don't throw - allow service to continue without RabbitMQ
    }
  }

  async onModuleDestroy() {
    if (this.channel) {
      await this.channel.close();
    }
    if (this.connection) {
      await (this.connection as any).close();
    }
  }

  /**
   * Publish user interaction event to AI service
   */
  async publishUserInteraction(event: UserInteractionEvent): Promise<boolean> {
    if (!this.channel) {
      console.warn('RabbitMQ channel not available, skipping event');
      return false;
    }

    try {
      const message = Buffer.from(JSON.stringify(event));
      return this.channel.sendToQueue(
        this.USER_INTERACTIONS_QUEUE,
        message,
        { persistent: true },
      );
    } catch (error) {
      console.error('Error publishing user interaction event:', error);
      return false;
    }
  }

  /**
   * Publish cart event
   */
  async publishCartEvent(event: {
    userId: string;
    itemId: number;
    action: 'add' | 'remove' | 'update';
    quantity?: number;
  }): Promise<boolean> {
    if (!this.channel) return false;

    try {
      const message = Buffer.from(JSON.stringify(event));
      return this.channel.sendToQueue(
        this.CART_EVENTS_QUEUE,
        message,
        { persistent: true },
      );
    } catch (error) {
      console.error('Error publishing cart event:', error);
      return false;
    }
  }

  /**
   * Publish wishlist event
   */
  async publishWishlistEvent(event: {
    userId: string;
    itemId: number;
    action: 'add' | 'remove';
  }): Promise<boolean> {
    if (!this.channel) return false;

    try {
      const message = Buffer.from(JSON.stringify(event));
      return this.channel.sendToQueue(
        this.WISHLIST_EVENTS_QUEUE,
        message,
        { persistent: true },
      );
    } catch (error) {
      console.error('Error publishing wishlist event:', error);
      return false;
    }
  }

  /**
   * Publish order event
   */
  async publishOrderEvent(event: {
    userId: string;
    orderId: string;
    itemIds: number[];
    totalAmount: number;
  }): Promise<boolean> {
    if (!this.channel) return false;

    try {
      const message = Buffer.from(JSON.stringify(event));
      return this.channel.sendToQueue(
        this.ORDER_EVENTS_QUEUE,
        message,
        { persistent: true },
      );
    } catch (error) {
      console.error('Error publishing order event:', error);
      return false;
    }
  }
}

