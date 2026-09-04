import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { BranchAccessGuard } from '../../common/guards/branch-access.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionGuard, BranchAccessGuard)
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  /**
   * Hem `startDate/endDate` (uzun form) hem `from/to` (kısa form) kabul edilir.
   * Verilmişse önce `startDate/endDate` tercih edilir.
   */
  private parseRange(
    startDate?: string,
    endDate?: string,
    from?: string,
    to?: string,
  ): { startDate?: Date; endDate?: Date } {
    const sd = startDate ?? from;
    const ed = endDate ?? to;
    return {
      startDate: sd ? new Date(sd) : undefined,
      endDate: ed ? new Date(ed) : undefined,
    };
  }

  @Get('receipt-list')
  @RequirePermission('report.receiptList')
  receiptList(
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('userId') userId?: string,
    @Query('currencyCode') currencyCode?: string,
  ) {
    return this.service.receiptList({
      branchId,
      userId,
      currencyCode,
      ...this.parseRange(startDate, endDate, from, to),
    });
  }

  @Get('daily-detail')
  @RequirePermission('report.dailyDetail')
  dailyDetail(
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('userId') userId?: string,
  ) {
    return this.service.dailyDetail({
      branchId,
      userId,
      ...this.parseRange(startDate, endDate, from, to),
    });
  }

  @Get('profitability')
  @RequirePermission('report.profitability')
  profitability(
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.profitability({
      branchId,
      ...this.parseRange(startDate, endDate, from, to),
    });
  }

  @Get('personnel')
  @RequirePermission('report.personnel')
  personnel(
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.personnel({
      branchId,
      ...this.parseRange(startDate, endDate, from, to),
    });
  }

  @Get('cash-ledger')
  @RequirePermission('cash.ledger')
  cashLedger(
    @Query('branchId') branchId: string,
    @Query('cashAccountId') cashAccountId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.cashLedger({
      branchId,
      cashAccountId,
      ...this.parseRange(startDate, endDate, from, to),
    });
  }
}