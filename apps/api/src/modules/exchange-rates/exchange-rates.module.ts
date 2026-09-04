import { Module } from '@nestjs/common';
import { ExchangeRatesService } from './exchange-rates.service';
import { ExchangeRatesController } from './exchange-rates.controller';
import { RateDifferenceService } from './rate-difference.service';

@Module({
  controllers: [ExchangeRatesController],
  providers: [ExchangeRatesService, RateDifferenceService],
  exports: [ExchangeRatesService, RateDifferenceService],
})
export class ExchangeRatesModule {}
