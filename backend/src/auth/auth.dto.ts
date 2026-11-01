import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Alice Mercer' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'alice@example.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: '+1 555 010 9900' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @ApiProperty({ example: 'StrongPass@123' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  acceptTerms!: boolean;

  @ApiPropertyOptional({ example: 'United States' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'alice.test@navrix.local' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'NavrixUser@123' })
  @IsString()
  @MinLength(1)
  password!: string;

  @ApiPropertyOptional({ description: 'Set true when logging into Admin Portal' })
  @IsOptional()
  @IsBoolean()
  requireAdmin?: boolean;
}

export class GoogleAuthDto {
  @ApiProperty({ description: 'Google OAuth ID token (or mock dev credential)' })
  @IsString()
  @MinLength(4)
  idToken!: string;

  @ApiPropertyOptional({ example: 'google.user@navrix.local' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'Google Investor' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Set true when logging into Admin Portal' })
  @IsOptional()
  @IsBoolean()
  requireAdmin?: boolean;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'alice@example.com' })
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(16)
  token!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword!: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword!: string;
}

export class VerifyEmailDto {
  @ApiProperty()
  @IsString()
  @MinLength(16)
  token!: string;
}

