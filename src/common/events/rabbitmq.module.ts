import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RabbitMQService } from './rabbitmq.service';
import * as amqp from 'amqplib';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'RABBITMQ_CONNECTION',
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger('RabbitMQModule');
        const host = configService.get<string>('RABBITMQ_HOST', 'localhost');
        const port = configService.get<number>('RABBITMQ_PORT', 5672);
        const user = configService.get<string>('RABBITMQ_USER', 'swirl_user');
        const password = configService.get<string>('RABBITMQ_PASSWORD', 'swirl_password');
        const url = configService.get<string>('RABBITMQ_URL');

        if (configService.get<string>('RABBITMQ_ENABLED') === 'false') {
          logger.warn('RabbitMQ is disabled via RABBITMQ_ENABLED config');
          return null;
        }

        const connectionString = url || `amqp://${user}:${password}@${host}:${port}`;

        // Mask password for logging
        const maskedUrl = connectionString.replace(/:([^@]+)@/, ':****@');
        logger.log(`📡 Attempting to connect to RabbitMQ at ${maskedUrl}`);

        return amqp.connect(connectionString).catch((err) => {
          logger.error(`❌ RabbitMQ Connection Error: ${err.message}`);
          logger.warn('⚠️ Application will continue without RabbitMQ messaging.');
          return null;
        });
      },
      inject: [ConfigService],
    },
    RabbitMQService,
  ],
  exports: [RabbitMQService],
})
export class RabbitMQModule { }

