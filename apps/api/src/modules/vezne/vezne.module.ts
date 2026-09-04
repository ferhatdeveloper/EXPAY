import { Module } from '@nestjs/common';
import { VezneService } from './vezne.service';
import { VezneController } from './vezne.controller';
import { ExchangeRatesModule } from '../exchange-rates/exchange-rates.module';
import { AccountingModule } from '../accounting/accounting.module';
import { CurrenciesModule } from '../currencies/currencies.module';

@Module({
  imports: [ExchangeRatesModule, AccountingModule, CurrenciesModule],
  controllers: [VezneController],
  providers: [VezneService],
  exports: [VezneService],
})
export class VezneModule {}
