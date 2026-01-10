import { Module } from '@nestjs/common';
import { WishlistController } from './wishlist.controller';
import { WishlistService } from './wishlist.service';
import { CacheModule } from '../../common/cache/cache.module';
import { EventsModule } from '../../common/events/events.module';

@Module({
  imports: [CacheModule, EventsModule],
  controllers: [WishlistController],
  providers: [WishlistService],
  exports: [WishlistService],
})
export class WishlistModule {}

