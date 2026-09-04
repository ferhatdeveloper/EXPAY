import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  CreateAccountingAccountSchema,
  CreateAccountingVoucherSchema,
  CreateFiscalYearSchema,
} from '@doviz/shared';
import { AccountingService } from './accounting.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from "@doviz/shared";

@Controller('accounting')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AccountingController {
  constructor(private readonly service: AccountingService) {}

  @Get('accounts')
  @RequirePermission('accounting.account.correct')
  listAccounts(@Query('active') active?: string) {
    return this.service.listAccounts(active === undefined ? undefined : active === 'true');
  }

  @Get('accounts/:id')
  @RequirePermission('accounting.account.correct')
  getAccount(@Param('id') id: string) {
    return this.service.getAccount(id);
  }

  @Post('accounts')
  @RequirePermission('accounting.account.create')
  createAccount(@Body(new ZodValidationPipe(CreateAccountingAccountSchema)) input: any) {
    return this.service.createAccount(input as never);
  }

  @Patch('accounts/:id')
  @RequirePermission('accounting.account.correct')
  updateAccount(@Param('id') id: string, @Body() input: { name?: string; active?: boolean }) {
    return this.service.updateAccount(id, input);
  }

  @Post('vouchers')
  @RequirePermission('accounting.voucher.create')
  createVoucher(@Body(new ZodValidationPipe(CreateAccountingVoucherSchema)) input: any, @CurrentUser() user: AuthUser) {
    return this.service.createVoucher(input as never, user);
  }

  @Post('vouchers/:id/correct')
  @RequirePermission('accounting.voucher.correct')
  correct(@Param('id') id: string, @Body('reason') reason: string) {
    return this.service.correctVoucher(id, reason);
  }

  @Get('vouchers')
  @RequirePermission('accounting.voucher.correct')
  listVouchers(@Query('branchId') branchId: string, @Query('startDate') startDate?: string, @Query('endDate') endDate?: string, @Query('voucherType') voucherType?: string) {
    return this.service.listVouchers(branchId, startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined, voucherType);
  }

  @Get('vouchers/:id')
  @RequirePermission('accounting.voucher.correct')
  voucherDetail(@Param('id') id: string) {
    return this.service.voucherDetail(id);
  }

  @Get('fiscal-years')
  @RequirePermission('accounting.fiscalYear')
  fiscalYears() {
    return this.service.listFiscalYears();
  }

  @Post('fiscal-years')
  @RequirePermission('accounting.fiscalYear')
  createFiscalYear(@Body(new ZodValidationPipe(CreateFiscalYearSchema)) input: any) {
    return this.service.createFiscalYear(input as never);
  }

  @Post('fiscal-years/:id/activate')
  @RequirePermission('accounting.fiscalYear')
  activate(@Param('id') id: string, @Body('branchId') branchId: string) {
    return this.service.setActiveFiscalYear(branchId, id);
  }

  @Get('ledger')
  @RequirePermission('accounting.ledger')
  ledger(@Query('branchId') branchId: string, @Query('accountId') accountId: string, @Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.service.ledger(branchId, accountId, startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined);
  }

  @Post('day-end')
  @RequirePermission('manager.dayEnd')
  dayEnd(@Body('branchId') branchId: string, @Body('notes') notes: string | undefined, @CurrentUser() user: AuthUser) {
    return this.service.dayEnd(branchId, user, notes);
  }

  @Get('day-end')
  @RequirePermission('manager.dayEnd')
  listDayEnds(@Query('branchId') branchId: string) {
    return this.service.listDayEnds(branchId);
  }
}