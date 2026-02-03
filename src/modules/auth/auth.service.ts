import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { OtpType, OtpStatus, UserStatus } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly mockOtpCode: string;
  private readonly otpExpiryMinutes: number;
  private readonly maxOtpAttempts: number;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.mockOtpCode = this.configService.get<string>('MOCK_OTP_CODE', '1234');
    this.otpExpiryMinutes = parseInt(
      this.configService.get<string>('OTP_EXPIRY_MINUTES', '10'),
    );
    this.maxOtpAttempts = parseInt(
      this.configService.get<string>('OTP_MAX_ATTEMPTS', '5'),
    );
  }

  async requestOtp(dto: RequestOtpDto) {
    const { email, phone } = dto;

    if (!email && !phone) {
      throw new BadRequestException('Either email or phone is required');
    }

    // Check if user exists
    let user = null;
    if (email) {
      user = await this.prisma.user.findUnique({ where: { email } });
    } else if (phone) {
      user = await this.prisma.user.findUnique({ where: { phone } });
    }

    // Generate OTP (mock - always returns same code for development)
    const otpCode = this.mockOtpCode;
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.otpExpiryMinutes);

    // Create or update OTP record
    const otpData = {
      code: otpCode,
      type: OtpType.LOGIN,
      status: OtpStatus.PENDING,
      expiresAt,
      attempts: 0,
      maxAttempts: this.maxOtpAttempts,
      ...(email && { email }),
      ...(phone && { phone }),
      ...(user && { userId: user.id }),
    };

    await this.prisma.otp.create({
      data: otpData,
    });

    // Update user's OTP fields (if user exists)
    if (user) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          otpCode,
          otpExpiresAt: expiresAt,
          lastOtpSentAt: new Date(),
        },
      });
    }

    // In production, send OTP via SMS/Email
    // For now, we return it in development (mock)
    return {
      message: 'OTP sent successfully',
      // Only return OTP in development
      ...(process.env.NODE_ENV === 'development' && { otp: otpCode }),
      expiresIn: this.otpExpiryMinutes * 60, // seconds
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const { email, phone, code, name } = dto;

    if (!email && !phone) {
      throw new BadRequestException('Either email or phone is required');
    }

    // Find pending OTP
    const otp = await this.prisma.otp.findFirst({
      where: {
        ...(email && { email }),
        ...(phone && { phone }),
        status: OtpStatus.PENDING,
        type: OtpType.LOGIN,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      throw new NotFoundException('OTP not found or already used');
    }

    // Check if OTP is expired
    if (new Date() > otp.expiresAt) {
      await this.prisma.otp.update({
        where: { id: otp.id },
        data: { status: OtpStatus.EXPIRED },
      });
      throw new BadRequestException('OTP has expired');
    }

    // Check attempts
    if (otp.attempts >= otp.maxAttempts) {
      await this.prisma.otp.update({
        where: { id: otp.id },
        data: { status: OtpStatus.EXPIRED },
      });
      throw new BadRequestException('Maximum OTP attempts exceeded');
    }

    // Verify OTP code
    if (otp.code !== code) {
      await this.prisma.otp.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('Invalid OTP code');
    }

    // Mark OTP as verified
    await this.prisma.otp.update({
      where: { id: otp.id },
      data: {
        status: OtpStatus.VERIFIED,
        verifiedAt: new Date(),
      },
    });

    // Find or create user
    let user = null;
    if (email) {
      user = await this.prisma.user.findUnique({ where: { email } });
    } else if (phone) {
      user = await this.prisma.user.findUnique({ where: { phone } });
    }

    if (!user) {
      // Create new user (registration)
      if (!name) {
        throw new BadRequestException('Name is required for registration');
      }

      user = await this.prisma.user.create({
        data: {
          email: email || null,
          phone: phone || null,
          name,
          status: UserStatus.ACTIVE,
          emailVerified: !!email,
          phoneVerified: !!phone,
          otpCode: null,
          otpExpiresAt: null,
        },
      });
    } else {
      // Update existing user
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          failedLoginAttempts: 0,
          lockedUntil: null,
          ...(email && { emailVerified: true }),
          ...(phone && { phoneVerified: true }),
          otpCode: null,
          otpExpiresAt: null,
        },
      });
    }

    // Generate JWT token
    const payload = {
      sub: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      access_token: accessToken,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
      },
    };
  }

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        role: true,
        status: true,
        emailVerified: true,
        phoneVerified: true,
      },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      return null;
    }

    return user;
  }
}

