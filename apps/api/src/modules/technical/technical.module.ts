import { Module } from '@nestjs/common';
import { TechnicalService } from './technical.service';
import { TechnicalController } from './technical.controller';

@Module({
  controllers: [TechnicalController],
  providers: [TechnicalService],
  exports: [TechnicalService],
})
export class TechnicalModule {}