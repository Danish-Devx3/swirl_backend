import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsPhoneNumber } from 'class-validator';

export class RequestOtpDto {
  @ApiProperty({
    description: 'Email address',
    example: 'user@example.com',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    description: 'Phone number',
    example: '+919876543210',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;
}

