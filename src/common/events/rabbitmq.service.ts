import { Injectable, Inject, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(RabbitMQService.name);
  private channel: amqp.Channel | null = null;
  private connection: amqp.Connection | null = null;

  // Queue names
  private readonly USER_INTERACTIONS_QUEUE = 'user_interactions';
  private readonly CART_EVENTS_QUEUE = 'cart_events';
  private readonly WISHLIST_EVENTS_QUEUE = 'wishlist_events';
  private readonly ORDER_EVENTS_QUEUE = 'order_events';

  constructor(
    @Inject('RABBITMQ_CONNECTION')
    private connectionPromise: Promise<amqp.Connection | null>,
  ) { }

  async onModuleInit() {
    try {
      this.connection = await this.connectionPromise;
      if (!this.connection) {
        this.logger.warn(
          '⚠️ RabbitMQ connection not available. Skipping queue initialization.',
        );
        return;
      }
      this.channel = await (this.connection as any).createChannel();

      // Declare queues (durable for persistence)
      await this.channel.assertQueue(this.USER_INTERACTIONS_QUEUE, {
        durable: true,
      });
      await this.channel.assertQueue(this.CART_EVENTS_QUEUE, { durable: true });
      await this.channel.assertQueue(this.WISHLIST_EVENTS_QUEUE, {
        durable: true,
      });
      await this.channel.assertQueue(this.ORDER_EVENTS_QUEUE, { durable: true });

      this.logger.log('✅ RabbitMQ connected and queues declared');
    } catch (error) {
      this.logger.error('❌ Failed to initialize RabbitMQ channel:', error);
      // Don't throw - allow service to continue without RabbitMQ
    }
  }

  async onModuleDestroy() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await (this.connection as any).close();
      }
    } catch (error) {
      this.logger.error('Error closing RabbitMQ connection:', error);
    }
  }

  /**
   * Publish user interaction event to AI service
   */
  async publishUserInteraction(event: UserInteractionEvent): Promise<boolean> {
    if (!this.channel) {
      this.logger.warn('RabbitMQ channel not available, skipping event');
      return false;
    }

    try {
      const message = Buffer.from(JSON.stringify(event));
      return this.channel.sendToQueue(this.USER_INTERACTIONS_QUEUE, message, {
        persistent: true,
      });
    } catch (error) {
      this.logger.error('Error publishing user interaction event:', error);
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
      return this.channel.sendToQueue(this.CART_EVENTS_QUEUE, message, {
        persistent: true,
      });
    } catch (error) {
      this.logger.error('Error publishing cart event:', error);
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
      return this.channel.sendToQueue(this.WISHLIST_EVENTS_QUEUE, message, {
        persistent: true,
      });
    } catch (error) {
      this.logger.error('Error publishing wishlist event:', error);
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
      return this.channel.sendToQueue(this.ORDER_EVENTS_QUEUE, message, {
        persistent: true,
      });
    } catch (error) {
      this.logger.error('Error publishing order event:', error);
      return false;
    }
  }
}
