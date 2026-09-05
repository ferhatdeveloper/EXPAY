import { Module } from '@nestjs/common';
import { EmanetController } from './emanet.controller';
import { EmanetService } from './emanet.service';

@Module({
  controllers: [EmanetController],
  providers: [EmanetService],
  exports: [EmanetService],
})
export class EmanetModule {}
