import {
  Body,
  Controller,
  Get,
  Module,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import { DepositStateService } from './deposit-state.service';
import { DepositsService } from './deposits.service';

export class CreateDepositDto {
  @ApiProperty({ example: 100 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiPropertyOptional({ example: 'BNB_SMART_CHAIN' })
  @IsOptional()
  @IsString()
  network?: string;

  @ApiPropertyOptional({ example: 'NAVRIX-CORE-30D' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  planCode?: string;
}

export class SubmitPaymentBodyDto {
  @ApiProperty({
    example:
      '0x9999999999999999999999999999999999999999999999999999999999999901',
  })
  @IsString()
  transactionHash!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

@ApiTags('Deposits')
@Controller('deposits')
export class DepositsController {
  constructor(private readonly depositsService: DepositsService) {}

  @Get('config')
  @ApiOperation({
    summary:
      'Get active BEP-20 USDT deposit network config, limits, receiving wallet & QR',
  })
  async getConfig() {
    return this.depositsService.getPublicDepositConfig();
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary:
      'Create a unique DEP-YYYYMMDD-XXXXXX deposit request in PENDING_PAYMENT state',
  })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDepositDto,
  ) {
    return this.depositsService.createDeposit({
      userId: user.id,
      amount: dto.amount,
      network: dto.network,
      planCode: dto.planCode,
    });
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List all deposits for the authenticated user' })
  async list(@CurrentUser() user: AuthenticatedUser) {
    return this.depositsService.listUserDeposits(user.id);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Retrieve deposit details & QR payment instructions' })
  async getOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.depositsService.getUserDepositByUid(user.id, id);
  }

  @Post(':id/submit-payment')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiConsumes('multipart/form-data', 'application/json')
  @UseInterceptors(
    FileInterceptor('screenshot', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @ApiOperation({
    summary:
      'Submit mandatory BSC transaction hash + optional payment screenshot for blockchain verification',
  })
  async submitPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: SubmitPaymentBodyDto,
    @Req() req: Request,
    @UploadedFile()
    file?: { buffer: Buffer; mimetype: string; size: number },
  ) {
    return this.depositsService.submitPayment({
      userId: user.id,
      depositUidOrId: id,
      transactionHash: body.transactionHash,
      notes: body.notes,
      screenshotFile: file,
      ipAddress:
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.ip,
    });
  }

  @Get(':id/screenshot')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Stream private payment screenshot (restricted to owner or admin)',
  })
  async streamScreenshot(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const file = await this.depositsService.readAuthorizedScreenshot({
      requesterId: user.id,
      requesterRole: user.role,
      depositUidOrId: id,
    });

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.send(file.buffer);
    return { __rawStream: true };
  }
}

@Module({
  controllers: [DepositsController],
  providers: [DepositStateService, DepositsService],
  exports: [DepositStateService, DepositsService],
})
export class DepositsModule {}
