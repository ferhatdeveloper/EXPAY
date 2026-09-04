import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { UpsertExchangeRateSchema } from '@doviz/shared';
import { ExchangeRatesService } from './exchange-rates.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from "@doviz/shared";

@Controller('exchange-rates')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ExchangeRatesController {
  constructor(private readonly service: ExchangeRatesService) {}

  @Post()
  @RequirePermission('rate.free')
  upsert(@Body(new ZodValidationPipe(UpsertExchangeRateSchema)) input: any, @CurrentUser() user: AuthUser) {
    return this.service.upsert(input as never, user);
  }

  @Post('raw-free')
  @RequirePermission('rate.rawFree')
  upsertRawFree(@Body() input: { branchId: string; currencyCode: string; rawBuyRate: number; rawSellRate: number; effectiveAt?: string; note?: string }, @CurrentUser() user: AuthUser) {
    return this.service.upsertRawFree({ ...input, effectiveAt: input.effectiveAt ? new Date(input.effectiveAt) : undefined } as never, user);
  }

  @Get()
  @RequirePermission('rate.old')
  list(
    @Query('branchId') branchId: string,
    @Query('currencyCode') currencyCode?: string,
    @Query('rateType') rateType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.list({
      branchId,
      currencyCode,
      rateType,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 100,
    });
  }

  @Get('current')
  @RequirePermission('rate.free')
  current(@Query('branchId') branchId: string) {
    return this.service.currentFree(branchId);
  }

  @Get('closing')
  @RequirePermission('rate.closing')
  closing(@Query('branchId') branchId: string, @Query('date') date: string) {
    return this.service.closingRatesForDate(branchId, new Date(date));
  }

  /**
   * R-05: Kapanış kurunu otomatik hesapla (son N işlem ağırlıklı ortalama)
   * ve DB'ye CLOSING kayıt olarak yaz. Manuel CLOSING varsa atlar.
   */
  @Post('closing/auto')
  @RequirePermission('rate.closing')
  closingAuto(
    @Body() body: { branchId: string; date?: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.upsertAutoClosingRates(
      body.branchId,
      body.date ? new Date(body.date) : new Date(),
      user,
    );
  }

  /**
   * R-13: Manager yetkisi ile bir kur satırını kilitler. Kilitlendiğinde
   * `upsert` ile üzerine yeni kayıt yazılamaz.
   */
  @Post(':id/lock')
  @RequirePermission('manager.rateFree')
  lock(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.lockRate(id, user);
  }

  /**
   * R-13: Kilitli kur satırını açar.
   */
  @Post(':id/unlock')
  @RequirePermission('manager.rateFree')
  unlock(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.unlockRate(id, user);
  }

  @Get('deviations')
  @RequirePermission('rateDeviation.report')
  deviations(
    @Query('branchId') branchId?: string,
    @Query('currencyCode') currencyCode?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.deviationReport({
      branchId,
      currencyCode,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 100,
    });
  }
}