import { Module } from '@nestjs/common';
import { AccountingService } from './accounting.service';
import { AccountingController } from './accounting.controller';
import { OpeningVoucherService } from './opening-voucher.service';

@Module({
  controllers: [AccountingController],
  providers: [AccountingService, OpeningVoucherService],
  exports: [AccountingService, OpeningVoucherService],
})
export class AccountingModule {}
