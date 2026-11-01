import {
  Controller,
  Get,
  HttpStatus,
  Injectable,
  Module,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma.service';
import { AppException } from '../common/errors/app.exception';

@Injectable()
export class InvestmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPlans() {
    return this.prisma.investmentPlan.findMany({
      where: { isActive: true },
      orderBy: { minAmount: 'asc' },
    });
  }

  async listUserInvestments(userId: string) {
    return this.prisma.investment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        plan: true,
        deposit: {
          select: {
            depositUid: true,
            requestedAmount: true,
            verifiedAmount: true,
          },
        },
        interestRecords: {
          orderBy: { creditedAt: 'desc' },
        },
      },
    });
  }

  async getUserInvestment(userId: string, uidOrId: string) {
    const inv = await this.prisma.investment.findFirst({
      where: {
        userId,
        OR: [{ investmentUid: uidOrId }, { id: uidOrId }],
      },
      include: {
        plan: true,
        deposit: true,
        interestRecords: {
          orderBy: { creditedAt: 'desc' },
        },
      },
    });

    if (!inv) {
      throw new AppException(
        'INVESTMENT_NOT_FOUND',
        'Investment record was not found.',
        HttpStatus.NOT_FOUND,
      );
    }

    return inv;
  }

  async listUserInterestHistory(userId: string) {
    return this.prisma.interestRecord.findMany({
      where: { userId },
      orderBy: { creditedAt: 'desc' },
      include: {
        investment: {
          select: {
            investmentUid: true,
            principalAmount: true,
            interestModel: true,
            interestRate: true,
          },
        },
      },
    });
  }
}

@ApiTags('Investments & Yield')
@Controller('investments')
export class InvestmentsController {
  constructor(private readonly investmentsService: InvestmentsService) {}

  @Get('plans')
  @ApiOperation({ summary: 'List active configurable investment plans' })
  async getPlans() {
    return this.investmentsService.listPlans();
  }

  @Get('interest-history')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List credited interest/profit history for user' })
  async getInterestHistory(@CurrentUser() user: AuthenticatedUser) {
    return this.investmentsService.listUserInterestHistory(user.id);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List all investments for authenticated user' })
  async list(@CurrentUser() user: AuthenticatedUser) {
    return this.investmentsService.listUserInvestments(user.id);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get investment details and interest accruals' })
  async getOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.investmentsService.getUserInvestment(user.id, id);
  }
}

@Module({
  controllers: [InvestmentsController],
  providers: [InvestmentsService],
  exports: [InvestmentsService],
})
export class InvestmentsModule {}

