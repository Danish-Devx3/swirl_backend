import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { OtpType, OtpStatus, UserStatus } from '@prisma/client';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    otp: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        MOCK_OTP_CODE: '123456',
        OTP_EXPIRY_MINUTES: '10',
        OTP_MAX_ATTEMPTS: '5',
      };
      return config[key] || defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('requestOtp', () => {
    it('should throw BadRequestException if neither email nor phone provided', async () => {
      const dto: RequestOtpDto = {};

      await expect(service.requestOtp(dto)).rejects.toThrow(BadRequestException);
    });

    it('should create OTP for new user with email', async () => {
      const dto: RequestOtpDto = { email: 'test@example.com' };
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.otp.create.mockResolvedValue({
        id: 'otp-id',
        code: '123456',
        email: 'test@example.com',
      });

      const result = await service.requestOtp(dto);

      expect(result).toHaveProperty('message', 'OTP sent successfully');
      expect(mockPrismaService.otp.create).toHaveBeenCalled();
    });

    it('should create OTP for existing user', async () => {
      const dto: RequestOtpDto = { email: 'existing@example.com' };
      const existingUser = {
        id: 'user-id',
        email: 'existing@example.com',
      };
      mockPrismaService.user.findUnique.mockResolvedValue(existingUser);
      mockPrismaService.otp.create.mockResolvedValue({
        id: 'otp-id',
        code: '123456',
      });
      mockPrismaService.user.update.mockResolvedValue(existingUser);

      const result = await service.requestOtp(dto);

      expect(result).toHaveProperty('message', 'OTP sent successfully');
      expect(mockPrismaService.user.update).toHaveBeenCalled();
    });
  });

  describe('verifyOtp', () => {
    it('should throw BadRequestException if neither email nor phone provided', async () => {
      const dto: VerifyOtpDto = { code: '123456' };

      await expect(service.verifyOtp(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if OTP not found', async () => {
      const dto: VerifyOtpDto = { email: 'test@example.com', code: '123456' };
      mockPrismaService.otp.findFirst.mockResolvedValue(null);

      await expect(service.verifyOtp(dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if OTP expired', async () => {
      const dto: VerifyOtpDto = { email: 'test@example.com', code: '123456' };
      const expiredOtp = {
        id: 'otp-id',
        code: '123456',
        expiresAt: new Date(Date.now() - 1000), // Expired
        attempts: 0,
        maxAttempts: 5,
        status: OtpStatus.PENDING,
      };
      mockPrismaService.otp.findFirst.mockResolvedValue(expiredOtp);
      mockPrismaService.otp.update.mockResolvedValue(expiredOtp);

      await expect(service.verifyOtp(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw UnauthorizedException if OTP code is invalid', async () => {
      const dto: VerifyOtpDto = { email: 'test@example.com', code: 'wrong' };
      const validOtp = {
        id: 'otp-id',
        code: '123456',
        expiresAt: new Date(Date.now() + 600000), // Valid
        attempts: 0,
        maxAttempts: 5,
        status: OtpStatus.PENDING,
      };
      mockPrismaService.otp.findFirst.mockResolvedValue(validOtp);
      mockPrismaService.otp.update.mockResolvedValue(validOtp);

      await expect(service.verifyOtp(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should create new user and return token on successful verification', async () => {
      const dto: VerifyOtpDto = {
        email: 'new@example.com',
        code: '123456',
        name: 'New User',
      };
      const validOtp = {
        id: 'otp-id',
        code: '123456',
        expiresAt: new Date(Date.now() + 600000),
        attempts: 0,
        maxAttempts: 5,
        status: OtpStatus.PENDING,
      };
      const newUser = {
        id: 'user-id',
        email: 'new@example.com',
        name: 'New User',
        role: 'USER',
        status: UserStatus.ACTIVE,
        emailVerified: true,
        phoneVerified: false,
      };

      mockPrismaService.otp.findFirst.mockResolvedValue(validOtp);
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(newUser);
      mockPrismaService.otp.update.mockResolvedValue({
        ...validOtp,
        status: OtpStatus.VERIFIED,
      });
      mockJwtService.sign.mockReturnValue('jwt-token');

      const result = await service.verifyOtp(dto);

      expect(result).toHaveProperty('access_token', 'jwt-token');
      expect(result).toHaveProperty('user');
      expect(mockPrismaService.user.create).toHaveBeenCalled();
    });

    it('should update existing user and return token', async () => {
      const dto: VerifyOtpDto = {
        email: 'existing@example.com',
        code: '123456',
      };
      const validOtp = {
        id: 'otp-id',
        code: '123456',
        expiresAt: new Date(Date.now() + 600000),
        attempts: 0,
        maxAttempts: 5,
        status: OtpStatus.PENDING,
      };
      const existingUser = {
        id: 'user-id',
        email: 'existing@example.com',
        name: 'Existing User',
        role: 'USER',
        status: UserStatus.ACTIVE,
        emailVerified: false,
        phoneVerified: false,
      };

      mockPrismaService.otp.findFirst.mockResolvedValue(validOtp);
      mockPrismaService.user.findUnique.mockResolvedValue(existingUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...existingUser,
        emailVerified: true,
      });
      mockPrismaService.otp.update.mockResolvedValue({
        ...validOtp,
        status: OtpStatus.VERIFIED,
      });
      mockJwtService.sign.mockReturnValue('jwt-token');

      const result = await service.verifyOtp(dto);

      expect(result).toHaveProperty('access_token', 'jwt-token');
      expect(mockPrismaService.user.update).toHaveBeenCalled();
    });
  });

  describe('validateUser', () => {
    it('should return user if found and active', async () => {
      const userId = 'user-id';
      const user = {
        id: userId,
        email: 'test@example.com',
        phone: null,
        name: 'Test User',
        role: 'USER',
        status: UserStatus.ACTIVE,
        emailVerified: true,
        phoneVerified: false,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user);

      const result = await service.validateUser(userId);

      expect(result).toEqual(user);
    });

    it('should return null if user not found', async () => {
      const userId = 'non-existent';
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.validateUser(userId);

      expect(result).toBeNull();
    });

    it('should return null if user is not active', async () => {
      const userId = 'user-id';
      const inactiveUser = {
        id: userId,
        email: 'test@example.com',
        phone: null,
        name: 'Test User',
        role: 'USER',
        status: UserStatus.SUSPENDED,
        emailVerified: true,
        phoneVerified: false,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(inactiveUser);

      const result = await service.validateUser(userId);

      expect(result).toBeNull();
    });
  });
});

