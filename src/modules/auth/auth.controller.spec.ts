import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockAuthService = {
    requestOtp: jest.fn(),
    verifyOtp: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('requestOtp', () => {
    it('should call service.requestOtp and return result', async () => {
      const dto: RequestOtpDto = { email: 'test@example.com' };
      const expectedResult = {
        message: 'OTP sent successfully',
        expiresIn: 600,
      };

      mockAuthService.requestOtp.mockResolvedValue(expectedResult);

      const result = await controller.requestOtp(dto);

      expect(result).toEqual(expectedResult);
      expect(mockAuthService.requestOtp).toHaveBeenCalledWith(dto);
    });
  });

  describe('verifyOtp', () => {
    it('should call service.verifyOtp and return result', async () => {
      const dto: VerifyOtpDto = {
        email: 'test@example.com',
        code: '123456',
        name: 'Test User',
      };
      const expectedResult = {
        access_token: 'jwt-token',
        user: {
          id: 'user-id',
          email: 'test@example.com',
          name: 'Test User',
        },
      };

      mockAuthService.verifyOtp.mockResolvedValue(expectedResult);

      const result = await controller.verifyOtp(dto);

      expect(result).toEqual(expectedResult);
      expect(mockAuthService.verifyOtp).toHaveBeenCalledWith(dto);
    });
  });
});

