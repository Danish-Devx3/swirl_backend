import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheService, CACHE_TTL } from './cache.service';
import Redis from 'ioredis';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        return new Redis({
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          username: configService.get<string>('REDIS_USERNAME', 'default'),
          password: configService.get<string>('REDIS_PASSWORD', ''),
          db: configService.get<number>('REDIS_DB', 0),
          retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
        });
      },
      inject: [ConfigService],
    },
    CacheService,
  ],
  exports: [CacheService],
})
export class CacheModule { }

export { CACHE_TTL };

