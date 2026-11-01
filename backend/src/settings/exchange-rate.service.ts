import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AppException } from '../common/errors/app.exception';

export interface SeparatedFiatConversionQuote {
  fiatAmount: string;
  fiatCurrency: string;
  taxAmount: string;
  taxCurrency: string;
  cryptoAmount: string;
  cryptoCurrency: 'USDT';
  exchangeRate: string;
  rateTimestamp: Date;
}

/**
 * Section 34: Exchange-rate & tax separation abstraction.
 * Never mixes fiat payment amount, GST/tax amount, and USDT crypto balance,
 * and never hard-codes exchange rates. Reads dynamic feed from system_settings.
 */
@Injectable()
export class ExchangeRateService {
  constructor(private readonly prisma: PrismaService) {}

  async quoteFiatToUsdt(params: {
    fiatCurrency: 'USD' | 'EUR' | 'INR';
    fiatGrossAmount: number;
    taxPercentage?: number;
  }): Promise<SeparatedFiatConversionQuote> {
    const settingKey = `FX_RATE_${params.fiatCurrency}_PER_USDT`;
    const row = await this.prisma.systemSetting.findUnique({
      where: { key: settingKey },
    });

    if (!row || Number(row.value) <= 0) {
      throw new AppException(
        'EXCHANGE_RATE_NOT_CONFIGURED',
        `Live exchange rate (${settingKey}) is not configured in system settings.`,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const rate = Number(row.value);
    const taxPct = params.taxPercentage ?? 0;
    const taxAmount = (params.fiatGrossAmount * taxPct) / (100 + taxPct);
    const netFiatForCrypto = params.fiatGrossAmount - taxAmount;
    const cryptoAmount = netFiatForCrypto / rate;

    return {
      fiatAmount: netFiatForCrypto.toFixed(8),
      fiatCurrency: params.fiatCurrency,
      taxAmount: taxAmount.toFixed(8),
      taxCurrency: params.fiatCurrency,
      cryptoAmount: cryptoAmount.toFixed(8),
      cryptoCurrency: 'USDT',
      exchangeRate: rate.toFixed(8),
      rateTimestamp: row.updatedAt,
    };
  }
}

