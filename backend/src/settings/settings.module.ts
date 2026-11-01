import { Global, Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { ExchangeRateService } from './exchange-rate.service';

@Global()
@Module({
  providers: [SettingsService, ExchangeRateService],
  exports: [SettingsService, ExchangeRateService],
})
export class SettingsModule {}

