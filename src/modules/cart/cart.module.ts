import { Module } from '@nestjs/common';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { CacheModule } from '../../common/cache/cache.module';
import { EventsModule } from '../../common/events/events.module';
import { ProductService } from './product.service';

@Module({
  imports: [CacheModule, EventsModule],
  controllers: [CartController],
  providers: [CartService, ProductService],
  exports: [CartService],
})
export class CartModule { }

