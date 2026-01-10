import { Test, TestingModule } from '@nestjs/testing';
import { InteractionsService } from './interactions.service';
import { PrismaService } from '../../prisma/prisma.service';
import { InteractionType } from '@prisma/client';

describe('InteractionsService', () => {
  let service: InteractionsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    userInteraction: {
      create: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InteractionsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<InteractionsService>(InteractionsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recordInteraction', () => {
    it('should create interaction record', async () => {
      const userId = 'user-id';
      const interactionType = InteractionType.VIEW;
      const itemId = 1;
      const metadata = { source: 'feed' };

      const interaction = {
        id: 'interaction-1',
        userId,
        itemId,
        interactionType,
        metadata,
        syncedToAI: false,
      };

      mockPrismaService.userInteraction.create.mockResolvedValue(interaction);

      const result = await service.recordInteraction(
        userId,
        interactionType,
        itemId,
        metadata,
      );

      expect(result).toEqual(interaction);
      expect(mockPrismaService.userInteraction.create).toHaveBeenCalledWith({
        data: {
          userId,
          itemId,
          interactionType,
          metadata,
          syncedToAI: false,
        },
      });
    });

    it('should create interaction without itemId', async () => {
      const userId = 'user-id';
      const interactionType = InteractionType.VIEW;

      const interaction = {
        id: 'interaction-1',
        userId,
        itemId: null,
        interactionType,
        metadata: {},
        syncedToAI: false,
      };

      mockPrismaService.userInteraction.create.mockResolvedValue(interaction);

      const result = await service.recordInteraction(userId, interactionType);

      expect(result.itemId).toBeNull();
    });
  });

  describe('getUserInteractions', () => {
    it('should return user interactions with default limit', async () => {
      const userId = 'user-id';
      const interactions = [
        {
          id: 'interaction-1',
          userId,
          interactionType: InteractionType.VIEW,
        },
        {
          id: 'interaction-2',
          userId,
          interactionType: InteractionType.LIKE,
        },
      ];

      mockPrismaService.userInteraction.findMany.mockResolvedValue(interactions);

      const result = await service.getUserInteractions(userId);

      expect(result).toEqual(interactions);
      expect(mockPrismaService.userInteraction.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: 100,
      });
    });

    it('should return user interactions with custom limit', async () => {
      const userId = 'user-id';
      const limit = 50;

      mockPrismaService.userInteraction.findMany.mockResolvedValue([]);

      await service.getUserInteractions(userId, limit);

      expect(mockPrismaService.userInteraction.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: limit,
      });
    });
  });

  describe('getUnsyncedInteractions', () => {
    it('should return unsynced interactions', async () => {
      const interactions = [
        {
          id: 'interaction-1',
          syncedToAI: false,
        },
        {
          id: 'interaction-2',
          syncedToAI: false,
        },
      ];

      mockPrismaService.userInteraction.findMany.mockResolvedValue(interactions);

      const result = await service.getUnsyncedInteractions();

      expect(result).toEqual(interactions);
      expect(mockPrismaService.userInteraction.findMany).toHaveBeenCalledWith({
        where: { syncedToAI: false },
        take: 1000,
        orderBy: { timestamp: 'asc' },
      });
    });
  });

  describe('markAsSynced', () => {
    it('should mark interactions as synced', async () => {
      const interactionIds = ['interaction-1', 'interaction-2'];

      mockPrismaService.userInteraction.updateMany.mockResolvedValue({
        count: 2,
      });

      const result = await service.markAsSynced(interactionIds);

      expect(result.count).toBe(2);
      expect(mockPrismaService.userInteraction.updateMany).toHaveBeenCalledWith({
        where: { id: { in: interactionIds } },
        data: {
          syncedToAI: true,
          syncedAt: expect.any(Date),
        },
      });
    });
  });
});

