import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CreateCashAccountSchema, CreateCashMovementSchema } from '@doviz/shared';
import { CashService } from './cash.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from "@doviz/shared";

@Controller('cash')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class CashController {
  constructor(private readonly service: CashService) {}

  @Get('accounts')
  @RequirePermission('cash.accountNames')
  listAccounts(@Query('branchId') branchId?: string) {
    return this.service.listAccounts(branchId);
  }

  @Get('accounts/:id')
  @RequirePermission('cash.detail')
  getAccount(@Param('id') id: string) {
    return this.service.getAccount(id);
  }

  @Post('accounts')
  @RequirePermission('cash.account.create')
  createAccount(@Body(new ZodValidationPipe(CreateCashAccountSchema)) input: any) {
    return this.service.createAccount(input as never);
  }

  @Patch('accounts/:id')
  @RequirePermission('cash.account.correct')
  updateAccount(@Param('id') id: string, @Body() input: { name?: string; currencyCode?: string; active?: boolean }) {
    return this.service.updateAccount(id, input as any);
  }

  @Delete('accounts/:id')
  @RequirePermission('cash.account.correct')
  removeAccount(@Param('id') id: string) {
    return this.service.softDeleteAccount(id);
  }

  @Post('movements')
  @RequirePermission('cash.movement.create')
  createMovement(@Body(new ZodValidationPipe(CreateCashMovementSchema)) input: any, @CurrentUser() user: AuthUser) {
    return this.service.createMovement(input as never, user);
  }

  @Post('movements/:id/correct')
  @RequirePermission('cash.movement.correct')
  correct(@Param('id') id: string, @Body('reason') reason: string, @CurrentUser() user: AuthUser) {
    return this.service.correctMovement(id, reason, user);
  }

  @Get('movements')
  @RequirePermission('cash.list')
  listMovements(@Query('branchId') branchId: string, @Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.service.listMovements(branchId, startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined);
  }

  @Get('ledger')
  @RequirePermission('cash.ledger')
  ledger(@Query('branchId') branchId: string, @Query('cashAccountId') cashAccountId?: string, @Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.service.ledger(branchId, cashAccountId, startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined);
  }

  @Get('balances')
  @RequirePermission('cash.balance')
  balances(@Query('branchId') branchId: string, @Query('cashAccountId') cashAccountId?: string) {
    return this.service.balances(branchId, cashAccountId);
  }

  @Get('detail')
  @RequirePermission('cash.detail')
  detail(@Query('branchId') branchId: string, @Query('cashAccountId') cashAccountId: string, @Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.service.detail(branchId, cashAccountId, startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined);
  }
}