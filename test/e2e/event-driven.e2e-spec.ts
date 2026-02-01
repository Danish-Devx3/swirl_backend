import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { CacheService } from '../../src/common/cache/cache.service';
import { EventsService } from '../../src/common/events/events.service';

describe('Event-Driven Architecture E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cache: CacheService;
  let events: EventsService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    cache = moduleFixture.get<CacheService>(CacheService);
    events = moduleFixture.get<EventsService>(EventsService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Cart Events', () => {
    let userId: string;
    let authToken: string;

    beforeAll(async () => {
      // Create test user and get auth token
      // This is a simplified version - in real tests, use actual auth flow
      userId = 'test-user-e2e';
      authToken = 'test-token'; // In real tests, get from auth endpoint
    });

    it('should emit event when adding item to cart', async () => {
      const itemId = 1;
      const emitSpy = jest.spyOn(events, 'emitCartEvent');

      const response = await request(app.getHttpServer())
        .post('/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ itemId, quantity: 1 });

      expect(response.status).toBe(201);
      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          itemId,
          action: 'add',
        }),
      );
    });

    it('should cache cart after retrieval', async () => {
      const cacheKey = `user:${userId}:cart`;
      const getSpy = jest.spyOn(cache, 'get');

      await request(app.getHttpServer())
        .get('/cart')
        .set('Authorization', `Bearer ${authToken}`);

      expect(getSpy).toHaveBeenCalledWith(cacheKey);
    });
  });

  describe('Wishlist Events', () => {
    let userId: string;
    let authToken: string;

    beforeAll(async () => {
      userId = 'test-user-e2e';
      authToken = 'test-token';
    });

    it('should emit event when adding item to wishlist', async () => {
      const itemId = 1;
      const emitSpy = jest.spyOn(events, 'emitWishlistEvent');

      const response = await request(app.getHttpServer())
        .post('/wishlist')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ itemId });

      expect(response.status).toBe(201);
      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          itemId,
          action: 'add',
        }),
      );
    });
  });

  describe('User Profile Caching', () => {
    let userId: string;
    let authToken: string;

    beforeAll(async () => {
      userId = 'test-user-e2e';
      authToken = 'test-token';
    });

    it('should cache user profile', async () => {
      const cacheKey = `user:${userId}:profile`;
      const getSpy = jest.spyOn(cache, 'get');
      const setSpy = jest.spyOn(cache, 'set');

      // First call - should fetch from DB and cache
      await request(app.getHttpServer())
        .get(`/users/${userId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getSpy).toHaveBeenCalledWith(cacheKey);
      expect(setSpy).toHaveBeenCalledWith(
        cacheKey,
        expect.any(Object),
        expect.any(Number),
      );
    });
  });

  describe('Preferences Caching', () => {
    let userId: string;
    let authToken: string;

    beforeAll(async () => {
      userId = 'test-user-e2e';
      authToken = 'test-token';
    });

    it('should cache preferences', async () => {
      const preferenceType = 'theme';
      const cacheKey = `user:${userId}:preference:${preferenceType}`;
      const getSpy = jest.spyOn(cache, 'get');

      await request(app.getHttpServer())
        .get(`/preferences/${preferenceType}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getSpy).toHaveBeenCalledWith(cacheKey);
    });
  });
});

