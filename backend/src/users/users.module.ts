import {
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Patch,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma.service';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;
}

export class UpdateComplianceDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  taxResidency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  taxIdNumber?: string;

  @IsOptional()
  @IsBoolean()
  acceptTerms?: boolean;

  @IsOptional()
  @IsBoolean()
  acceptPrivacyPolicy?: boolean;

  @IsOptional()
  @IsBoolean()
  acceptRiskDisclosure?: boolean;

  @IsOptional()
  @IsBoolean()
  acceptInvestmentAgreement?: boolean;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { complianceProfile: true },
    });

    return {
      uid: user.publicUid,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      avatarUrl: user.avatarUrl,
      twoFactorEnabled: user.twoFactorEnabled,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      compliance: user.complianceProfile
        ? {
            kycStatus: user.complianceProfile.kycStatus,
            country: user.complianceProfile.country,
            taxResidency: user.complianceProfile.taxResidency,
            taxIdMasked: user.complianceProfile.taxIdMasked,
            termsAcceptedAt: user.complianceProfile.termsAcceptedAt,
            privacyAcceptedAt: user.complianceProfile.privacyAcceptedAt,
            riskDisclosureAcceptedAt: user.complianceProfile.riskDisclosureAcceptedAt,
            investmentAgreementAcceptedAt:
              user.complianceProfile.investmentAgreementAcceptedAt,
          }
        : null,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone.trim() || null } : {}),
      },
    });
    return this.getMe(userId);
  }

  async updateCompliance(userId: string, dto: UpdateComplianceDto) {
    const now = new Date();
    const maskedTax = dto.taxIdNumber
      ? `***-${dto.taxIdNumber.trim().slice(-4)}`
      : undefined;

    await this.prisma.complianceProfile.upsert({
      where: { userId },
      update: {
        ...(dto.country !== undefined ? { country: dto.country.trim() || null } : {}),
        ...(dto.taxResidency !== undefined
          ? { taxResidency: dto.taxResidency.trim() || null }
          : {}),
        ...(maskedTax !== undefined ? { taxIdMasked: maskedTax } : {}),
        ...(dto.acceptTerms ? { termsAcceptedAt: now } : {}),
        ...(dto.acceptPrivacyPolicy ? { privacyAcceptedAt: now } : {}),
        ...(dto.acceptRiskDisclosure ? { riskDisclosureAcceptedAt: now } : {}),
        ...(dto.acceptInvestmentAgreement
          ? { investmentAgreementAcceptedAt: now }
          : {}),
      },
      create: {
        userId,
        country: dto.country?.trim() || null,
        taxResidency: dto.taxResidency?.trim() || null,
        taxIdMasked: maskedTax || null,
        termsAcceptedAt: dto.acceptTerms ? now : null,
        privacyAcceptedAt: dto.acceptPrivacyPolicy ? now : null,
        riskDisclosureAcceptedAt: dto.acceptRiskDisclosure ? now : null,
        investmentAgreementAcceptedAt: dto.acceptInvestmentAgreement ? now : null,
      },
    });

    return this.getMe(userId);
  }
}

@ApiTags('Users & Compliance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get authenticated user profile and compliance status' })
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getMe(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update authenticated user profile fields' })
  async updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Put('me/compliance')
  @ApiOperation({
    summary:
      'Update configurable compliance placeholders (Country, Tax Residency, Disclosures)',
  })
  async updateCompliance(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateComplianceDto,
  ) {
    return this.usersService.updateCompliance(user.id, dto);
  }
}

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

