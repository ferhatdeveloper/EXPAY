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
import {
  BulkTransferToMainSchema,
  BanknoteCountSchema,
  CorrectVezneReceiptSchema,
  CreateVezneReceiptSchema,
  CreateVezneTransferSchema,
  DraftVezneReceiptSchema,
  PostVezneReceiptSchema,
  VoidVezneReceiptSchema,
} from '@doviz/shared';
import { VezneService } from './vezne.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '@doviz/shared';

@Controller('vezne')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class VezneController {
  constructor(private readonly service: VezneService) {}

  // ============================================================
  //                      Receipt lifecycle
  // ============================================================

  @Post('receipts')
  @RequirePermission('vezne.receipt.create')
  createReceipt(
    @Body(new ZodValidationPipe(CreateVezneReceiptSchema)) input: any,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.createReceipt(input as never, user);
  }

  /**
   * DRAFT fiş oluştur (muhasebeleştirme öncesi). R-11.
   */
  @Post('receipts/draft')
  @RequirePermission('vezne.receipt.create')
  draftReceipt(
    @Body(new ZodValidationPipe(DraftVezneReceiptSchema)) input: any,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.draftReceipt(input as never, user);
  }

  /**
   * DRAFT fişi muhasebeleştir (DRAFT -> POSTED). R-11.
   */
  @Post('receipts/post')
  @RequirePermission('vezne.receiptPost')
  postReceipt(
    @Body(new ZodValidationPipe(PostVezneReceiptSchema)) input: any,
  ) {
    return this.service.postReceipt(input as never);
  }

  /**
   * Fişi tamamen iptal et (POSTED/DRAFT -> VOIDED + ters fiş). R-11.
   * `reason` zorunlu (audit için).
   */
  @Post('receipts/void')
  @RequirePermission('vezne.receiptTransfer')
  voidReceipt(
    @Body(new ZodValidationPipe(VoidVezneReceiptSchema)) input: any,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.voidReceipt(input as never, user);
  }

  @Post('receipts/correct')
  @RequirePermission('vezne.receipt.correct')
  correctReceipt(
    @Body(new ZodValidationPipe(CorrectVezneReceiptSchema)) input: any,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.correctReceipt(input as never, user);
  }

  @Get('receipts')
  @RequirePermission('vezne.list')
  listReceipts(
    @Query('branchId') branchId?: string,
    @Query('userId') userId?: string,
    @Query('currencyCode') currencyCode?: string,
    @Query('receiptType') receiptType?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.listReceipts({
      branchId,
      userId,
      currencyCode,
      receiptType: receiptType as never,
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 50,
    });
  }

  // ============================================================
  //                       Transfers
  // ============================================================

  @Post('transfers')
  @RequirePermission('vezne.transfer.create')
  createTransfer(
    @Body(new ZodValidationPipe(CreateVezneTransferSchema)) input: any,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.createTransfer(input as never, user);
  }

  @Post('transfers/:id/correct')
  @RequirePermission('vezne.transfer.correct')
  correctTransfer(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.correctTransfer(id, reason, user);
  }

  @Post('bulk-transfer')
  @RequirePermission('vezne.bulkTransfer')
  bulk(
    @Body(new ZodValidationPipe(BulkTransferToMainSchema)) input: any,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.bulkTransferToMain(input as never, user);
  }

  @Post('banknote-count')
  @RequirePermission('vezne.banknoteCount')
  banknote(
    @Body(new ZodValidationPipe(BanknoteCountSchema)) input: any,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.banknoteCount(input as never, user);
  }

  @Get('monitor')
  @RequirePermission('vezne.monitor')
  monitor(@Query('branchId') branchId: string) {
    return this.service.monitor(branchId);
  }

  @Get('cash-drawers')
  @RequirePermission('vezne.view')
  drawers(@Query('branchId') branchId: string) {
    return this.service.listDrawers(branchId);
  }

  @Get('balances')
  @RequirePermission('vezne.balanceReport')
  balances(
    @Query('branchId') branchId: string,
    @Query('currencyCode') currencyCode?: string,
  ) {
    return this.service.balances(branchId, currencyCode);
  }
}
