import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RabbitMQService } from './rabbitmq.service';
import * as amqp from 'amqplib';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'RABBITMQ_CONNECTION',
      useFactory: async (configService: ConfigService) => {
        const host = configService.get<string>('RABBITMQ_HOST', 'localhost');
        const port = configService.get<number>('RABBITMQ_PORT', 5672);
        const user = configService.get<string>('RABBITMQ_USER', 'swirl_user');
        const password = configService.get<string>(
          'RABBITMQ_PASSWORD',
          'swirl_password',
        );

        const connectionString = `amqp://${user}:${password}@${host}:${port}`;
        return amqp.connect(connectionString);
      },
      inject: [ConfigService],
    },
    RabbitMQService,
  ],
  exports: [RabbitMQService],
})
export class RabbitMQModule {}

