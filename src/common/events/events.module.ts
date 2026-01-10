import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventsService } from './events.service';
import { RabbitMQModule } from './rabbitmq.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    RabbitMQModule,
  ],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}

