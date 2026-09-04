import { Module } from '@nestjs/common';
import { CurrenciesService } from './currencies.service';
import { CurrenciesController } from './currencies.controller';
import { TaxProfileService } from './tax-profile.service';

@Module({
  controllers: [CurrenciesController],
  providers: [CurrenciesService, TaxProfileService],
  exports: [CurrenciesService, TaxProfileService],
})
export class CurrenciesModule {}
