import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { BranchAccessGuard } from '../../common/guards/branch-access.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '@doviz/shared';
import { EmanetService } from './emanet.service';
import {
  EmanetCreateSchema,
  EmanetReleaseSchema,
  EmanetCloseSchema,
  EmanetAdjustSchema,
} from './emanet.schema';

@Controller('emanet')
@UseGuards(JwtAuthGuard, PermissionGuard, BranchAccessGuard)
export class EmanetController {
  constructor(private readonly svc: EmanetService) {}

  /** Tüm emanetler — şube/müşteri/status/currency filtresi. */
  @Get()
  @RequirePermission('customer.emanetView')
  list(
    @Query('branchId') branchId?: string,
    @Query('customerId') customerId?: string,
    @Query('status') status?: string,
    @Query('currency') currency?: string,
  ) {
    return this.svc.list({ branchId, customerId, status, currency });
  }

  /** Şube bazlı emanet özeti (kasa emanet durumu raporu). */
  @Get('branch-summary')
  @RequirePermission('customer.emanetView')
  branchSummary(@Query('branchId') branchId: string) {
    return this.svc.branchSummary(branchId);
  }

  /** Müşteri özet emanetleri. */
  @Get('summary/by-customer/:customerId')
  @RequirePermission('customer.emanetView')
  summaryByCustomer(@Param('customerId') customerId: string) {
    return this.svc.summaryByCustomer(customerId);
  }

  /** Tek emanet detayı — tüm hareketleri ile. */
  @Get(':id')
  @RequirePermission('customer.emanetView')
  get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  /** Yeni emanet aç. */
  @Post()
  @RequirePermission('customer.emanetCreate')
  create(
    @Body(new ZodValidationPipe(EmanetCreateSchema)) input: any,
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.create(input as never, user.id);
  }

  /** Kısmi iade. */
  @Post('release')
  @RequirePermission('customer.emanetRelease')
  release(
    @Body(new ZodValidationPipe(EmanetReleaseSchema)) input: any,
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.release(input as never, user.id);
  }

  /** Tam iade (tüm bakiyeyi tek seferde kapat). */
  @Post('close')
  @RequirePermission('customer.emanetRelease')
  close(
    @Body(new ZodValidationPipe(EmanetCloseSchema)) input: any,
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.close(input as never, user.id);
  }

  /** Manuel düzeltme (kayıp/hasar/sayım farkı). */
  @Post('adjust')
  @RequirePermission('customer.emanetAdjust')
  adjust(
    @Body(new ZodValidationPipe(EmanetAdjustSchema)) input: any,
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.adjust(input as never, user.id);
  }
}
