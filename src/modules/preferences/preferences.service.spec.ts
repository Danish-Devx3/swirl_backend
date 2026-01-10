import { Test, TestingModule } from '@nestjs/testing';
import { PreferencesService } from './preferences.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('PreferencesService', () => {
  let service: PreferencesService;
  let prisma: PrismaService;

  const mockPrismaService = {
    userPreference: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PreferencesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PreferencesService>(PreferencesService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('setPreference', () => {
    it('should create new preference', async () => {
      const userId = 'user-id';
      const preferenceType = 'theme';
      const preferenceValue = 'dark';

      const preference = {
        id: 'pref-1',
        userId,
        preferenceType,
        preferenceValue,
      };

      mockPrismaService.userPreference.upsert.mockResolvedValue(preference);

      const result = await service.setPreference(
        userId,
        preferenceType,
        preferenceValue,
      );

      expect(result).toEqual(preference);
      expect(mockPrismaService.userPreference.upsert).toHaveBeenCalledWith({
        where: {
          userId_preferenceType: {
            userId,
            preferenceType,
          },
        },
        update: {
          preferenceValue,
        },
        create: {
          userId,
          preferenceType,
          preferenceValue,
        },
      });
    });

    it('should update existing preference', async () => {
      const userId = 'user-id';
      const preferenceType = 'theme';
      const newValue = 'light';

      const updatedPreference = {
        id: 'pref-1',
        userId,
        preferenceType,
        preferenceValue: newValue,
      };

      mockPrismaService.userPreference.upsert.mockResolvedValue(
        updatedPreference,
      );

      const result = await service.setPreference(
        userId,
        preferenceType,
        newValue,
      );

      expect(result.preferenceValue).toBe(newValue);
    });
  });

  describe('getPreference', () => {
    it('should return preference if found', async () => {
      const userId = 'user-id';
      const preferenceType = 'theme';
      const preference = {
        id: 'pref-1',
        userId,
        preferenceType,
        preferenceValue: 'dark',
      };

      mockPrismaService.userPreference.findUnique.mockResolvedValue(preference);

      const result = await service.getPreference(userId, preferenceType);

      expect(result).toEqual(preference);
      expect(mockPrismaService.userPreference.findUnique).toHaveBeenCalledWith({
        where: {
          userId_preferenceType: {
            userId,
            preferenceType,
          },
        },
      });
    });

    it('should return null if preference not found', async () => {
      const userId = 'user-id';
      const preferenceType = 'theme';

      mockPrismaService.userPreference.findUnique.mockResolvedValue(null);

      const result = await service.getPreference(userId, preferenceType);

      expect(result).toBeNull();
    });
  });

  describe('getAllPreferences', () => {
    it('should return all preferences for user', async () => {
      const userId = 'user-id';
      const preferences = [
        {
          id: 'pref-1',
          userId,
          preferenceType: 'theme',
          preferenceValue: 'dark',
        },
        {
          id: 'pref-2',
          userId,
          preferenceType: 'language',
          preferenceValue: 'en',
        },
      ];

      mockPrismaService.userPreference.findMany.mockResolvedValue(preferences);

      const result = await service.getAllPreferences(userId);

      expect(result).toEqual(preferences);
      expect(mockPrismaService.userPreference.findMany).toHaveBeenCalledWith({
        where: { userId },
      });
    });
  });

  describe('deletePreference', () => {
    it('should delete preference', async () => {
      const userId = 'user-id';
      const preferenceType = 'theme';
      const deletedPreference = {
        id: 'pref-1',
        userId,
        preferenceType,
        preferenceValue: 'dark',
      };

      mockPrismaService.userPreference.delete.mockResolvedValue(
        deletedPreference,
      );

      const result = await service.deletePreference(userId, preferenceType);

      expect(result).toEqual(deletedPreference);
      expect(mockPrismaService.userPreference.delete).toHaveBeenCalledWith({
        where: {
          userId_preferenceType: {
            userId,
            preferenceType,
          },
        },
      });
    });
  });
});

