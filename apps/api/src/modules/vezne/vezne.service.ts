import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma, PrismaClient, VezneReceipt } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BulkTransferToMainInput,
  BanknoteCountInput,
  CreateVezneReceiptInput,
  CorrectVezneReceiptInput,
  CreateVezneTransferInput,
  DraftVezneReceiptInput,
  PostVezneReceiptInput,
  ReceiptType,
  VoidVezneReceiptInput,
} from '@doviz/shared';
import { AuthUser } from '@doviz/shared';
import { RateDifferenceService } from '../exchange-rates/rate-difference.service';
import { OpeningVoucherService } from '../accounting/opening-voucher.service';
import { TaxProfileService } from '../currencies/tax-profile.service';
import {
  startOfDayInBranch,
  endOfDayInBranch,
  isFirstDayOfYearInBranch,
} from '../../common/utils/date.util';

type Tx = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * VezneService — fixes R-15 / R-02 / R-11 / R-03 / R-08 / R-09 (Sets 1 + 2).
 *
 * Every public mutation that touches more than one table is wrapped in
 * `prisma.$transaction`. Receipt numbers come from the atomic
 * VezneReceiptSequence row (R-15). Status lifecycle is DRAFT / POSTED /
 * VOIDED / CORRECTED (R-11). Receipt rows with `customerId` automatically
 * produce a mirrored CustomerMovement (R-03). Corrected/voided receipts are
 * matched by `originalId` and their reverse customer movements are written
 * in the same transaction (R-09). Banknote counts with drift against the
 * system balance produce an ADJUSTMENT receipt + accounting voucher (R-08).
 */
@Injectable()
export class VezneService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rateDifference: RateDifferenceService,
    private readonly openingVoucher: OpeningVoucherService,
    private readonly taxProfile: TaxProfileService,
  ) {}

  // ============================================================
  //  R-15 + R-14 — atomic sequence allocation w/ branch timezone
  // ============================================================

  /**
   * Şubenin timezone'unu DB'den çekip start-of-day (local) hesaplar.
   * Cache'lenir (proses başına 1 sorgu yeterli).
   */
  private async getBranch(branchId: string) {
    return this.prisma.branch.findUnique({
      where: { id: branchId },
      select: { id: true, country: true, timezone: true },
    });
  }

  private async allocateReceiptNo(
    tx: Tx,
    branchId: string,
    businessDate: Date,
  ): Promise<string> {
    // Branch timezone'una göre local gün başlangıcını hesapla
    const branch = await tx.branch.findUnique({
      where: { id: branchId },
      select: { country: true, timezone: true },
    });
    const day = startOfDayInBranch(branch, businessDate);
    const updated = await tx.vezneReceiptSequence.upsert({
      where: { branchId_date: { branchId, date: day } },
      create: { branchId, date: day, lastNumber: 1 },
      update: { lastNumber: { increment: 1 } },
    });
    return `R-${formatYmd(businessDate)}-${String(updated.lastNumber).padStart(5, '0')}`;
  }

  // ============================================================
  //  R-03 — customer cari integration helpers
  // ============================================================

  /**
   * Mirrors a receipt into the customer's ledger.
   *
   * BUY:  müşteri bize yabancı sattı -> biz TRY borçlandık -> müşteri ALACAKLI
   *      → row 1 (TRY): direction='CREDIT', amount=tryAmount TRY
   *      → row 2 (foreign): direction='CREDIT', amount=foreignAmount, refType='VEZNE_RECEIPT_FOREIGN'
   *
   * SELL: tersi
   *      → row 1 (TRY): direction='DEBIT', amount=tryAmount TRY
   *      → row 2 (foreign): direction='DEBIT'
   *
   * Schema'da direction enum'ı sadece DEBIT/CREDIT olduğundan, foreign
   * tarafı ayrı refType ile işaretlenir. reverse() aşamasında iki satır da
   * DEBIT/CREDIT sign'i ters çevrilerek kompanse edilir.
   */
  private async createCustomerMovementsForReceipt(
    tx: Tx,
    receipt: VezneReceipt,
    user: AuthUser,
  ) {
    if (!receipt.customerId) return;
    const isBuy = receipt.receiptType === 'BUY';
    const receiptId = receipt.id;

    // 1) TRY tarafı — müşterinin bizden TRY alacağı (BUY) / borcu (SELL)
    await tx.customerMovement.create({
      data: {
        branchId: receipt.branchId,
        customerId: receipt.customerId,
        userId: user.id,
        currencyCode: 'TRY',
        direction: isBuy ? 'CREDIT' : 'DEBIT',
        amount: Number(receipt.tryAmount),
        foreignAmount: 0,
        rate: Number(receipt.rate),
        refType: 'VEZNE_RECEIPT',
        refId: receiptId,
        description: isBuy
          ? `VEZNE BUY ${receipt.foreignAmount} ${receipt.currencyCode} @ ${receipt.rate}`
          : `VEZNE SELL ${receipt.foreignAmount} ${receipt.currencyCode} @ ${receipt.rate}`,
      },
    });

    // 2) Yabancı tarafı — müşterinin döviz cinsinden bakiyesi
    //    BUY'da müşteri döviz sattı → döviz bakiyesi azaldı (DEBIT)
    //    SELL'de müşteri döviz aldı → döviz bakiyesi arttı (CREDIT)
    await tx.customerMovement.create({
      data: {
        branchId: receipt.branchId,
        customerId: receipt.customerId,
        userId: user.id,
        currencyCode: receipt.currencyCode,
        direction: isBuy ? 'DEBIT' : 'CREDIT',
        amount: Number(receipt.foreignAmount),
        foreignAmount: Number(receipt.foreignAmount),
        foreignCurrency: receipt.currencyCode,
        rate: Number(receipt.rate),
        refType: 'VEZNE_RECEIPT_FOREIGN',
        refId: receiptId,
        description: isBuy
          ? `Müşteri döviz pozisyonu azaldı (BUY) ${receipt.foreignAmount} ${receipt.currencyCode}`
          : `Müşteri döviz pozisyonu arttı (SELL) ${receipt.foreignAmount} ${receipt.currencyCode}`,
      },
    });
  }

  /**
   * R-09: Reverse all customer movements linked to this receipt
   * (matched by refId=receipt.id — covers both TRY and foreign rows).
   */
  private async reverseCustomerMovementsForReceipt(
    tx: Tx,
    receipt: VezneReceipt,
    user: AuthUser,
    reasonPrefix: 'DÜZELTME' | 'İPTAL',
  ) {
    if (!receipt.customerId) return;
    const linked = await tx.customerMovement.findMany({
      where: {
        refId: receipt.id,
        deletedAt: null,
        refType: { in: ['VEZNE_RECEIPT', 'VEZNE_RECEIPT_FOREIGN'] },
      },
    });
    for (const m of linked) {
      const revDirection = m.direction === 'CREDIT' ? 'DEBIT' : 'CREDIT';
      await tx.customerMovement.create({
        data: {
          branchId: m.branchId,
          customerId: m.customerId,
          userId: user.id,
          currencyCode: m.currencyCode,
          direction: revDirection,
          amount: Number(m.amount),
          foreignAmount: Number(m.foreignAmount),
          foreignCurrency: m.foreignCurrency,
          rate: m.rate ? Number(m.rate) : null,
          refType: `${m.refType}_REVERSE`,
          refId: receipt.id,
          description: `${reasonPrefix}: ${m.description ?? ''}`,
        },
      });
    }
  }

  // ============================================================
  //  R-02 — atomic createReceipt (also R-03)
  // ============================================================

  async createReceipt(input: CreateVezneReceiptInput, user: AuthUser) {
    if (input.tryAmount <= 0 || input.foreignAmount <= 0 || input.rate <= 0) {
      throw new BadRequestException('Amounts and rate must be positive');
    }
    return this.prisma.$transaction(async (tx) => {
      const drawer = await tx.cashDrawer.findFirst({
        where: { branchId: input.branchId, deletedAt: null },
      });
      if (!drawer) throw new NotFoundException('Cash drawer not found for branch');

      // R-04: yılın ilk günü + ilk POSTED fiş → otomatik açılış fişi
      await this.openingVoucher.ensureOpeningVoucher(
        tx,
        input.branchId,
        new Date(),
        { ...user, id: user.id } as AuthUser,
      );

      const receiptNo = await this.allocateReceiptNo(tx, input.branchId, new Date());
      const receipt = await tx.vezneReceipt.create({
        data: {
          branchId: input.branchId,
          cashDrawerId: drawer.id,
          userId: user.id,
          receiptNo,
          receiptType: input.receiptType as ReceiptType,
          currencyCode: input.currencyCode,
          foreignAmount: input.foreignAmount,
          rate: input.rate,
          tryAmount: input.tryAmount,
          customerId: input.customerId,
          customerName: input.customerName,
          description: input.description,
          status: 'POSTED',
          postedAt: new Date(),
        },
      });
      await this.createCustomerMovementsForReceipt(tx, receipt, user);

      // R-07: vergi satırları (TR BSMV/KDV veya IQ CBK)
      await this.taxProfile.computeAndPost(
        tx,
        {
          id: receipt.id,
          branchId: receipt.branchId,
          currencyCode: receipt.currencyCode,
          tryAmount: Number(receipt.tryAmount),
          taxCountry: input.taxCountry,
          taxExempted: input.taxExempted,
        },
        user,
      );

      // R-06: kur farkı muhasebesi (kapanış kuru varsa)
      await this.applyRateDifference(tx, receipt, user);

      return receipt;
    });
  }

  // ============================================================
  //  R-06 — kur farkı muhasebe helper
  // ============================================================

  /**
   * Kapanış kurunu DB'den çek ve R-06 voucher'ı oluştur (tx içinde).
   */
  private async applyRateDifference(
    tx: Tx,
    receipt: VezneReceipt,
    user: AuthUser,
  ) {
    // R-14: branch timezone'una göre bugünün aralığı
    const branch = await tx.branch.findUnique({
      where: { id: receipt.branchId },
      select: { country: true, timezone: true },
    });
    const today = startOfDayInBranch(branch, new Date());
    const tomorrow = endOfDayInBranch(branch, new Date());
    const closingBuy = await tx.exchangeRate.findFirst({
      where: {
        branchId: receipt.branchId,
        currencyCode: receipt.currencyCode,
        rateType: 'CLOSING',
        effectiveAt: { gte: today, lte: tomorrow },
        deletedAt: null,
      },
      orderBy: { effectiveAt: 'desc' },
    });
    const closingSell = await tx.exchangeRate.findFirst({
      where: {
        branchId: receipt.branchId,
        currencyCode: receipt.currencyCode,
        rateType: 'CLOSING',
        effectiveAt: { gte: today, lte: tomorrow },
        deletedAt: null,
      },
      orderBy: { effectiveAt: 'desc' },
    });
    await this.rateDifference.computeAndPost(
      tx,
      receipt,
      user,
      closingBuy ? Number(closingBuy.buyRate) : null,
      closingSell ? Number(closingSell.sellRate) : null,
    );
  }

  /**
   * Bu fiş için önceden oluşturulmuş R-06 ve R-07 voucher'ları ters çevirir
   * (R-09). Description içinde fiş ID'si geçer.
   */
  private async reverseAccountingForReceipt(
    tx: Tx,
    receipt: VezneReceipt,
    user: AuthUser,
    reasonPrefix: 'DÜZELTME' | 'İPTAL',
  ) {
    // R-06 voucher: description içinde "fiş <receiptNo>" geçer
    const vouchers = await tx.accountingVoucher.findMany({
      where: {
        branchId: receipt.branchId,
        deletedAt: null,
        description: { contains: receipt.receiptNo },
        voucherType: 'NORMAL',
      },
      include: { lines: true },
    });
    for (const v of vouchers) {
      const absTotal = Number(v.totalDebit);
      if (absTotal === 0) continue;
      const newNo = `${v.voucherNo}-REV-${reasonPrefix === 'İPTAL' ? 'V' : 'C'}`;
      await tx.accountingVoucher.create({
        data: {
          branchId: v.branchId,
          voucherNo: newNo,
          voucherType: 'CORRECTION',
          voucherDate: new Date(),
          description: `${reasonPrefix}: ${v.description}`,
          totalDebit: Number(v.totalCredit),
          totalCredit: Number(v.totalDebit),
          userId: user.id,
          postedAt: new Date(),
          lines: {
            create: v.lines.map((line) => ({
              accountId: line.accountId,
              currencyCode: line.currencyCode,
              debit: Number(line.credit),
              credit: Number(line.debit),
              description: `${reasonPrefix}: ${line.description ?? ''}`,
            })),
          },
        },
      });
      // Eski voucher'ı soft-delete
      await tx.accountingVoucher.update({
        where: { id: v.id },
        data: { deletedAt: new Date() },
      });
    }
  }

  // ============================================================
  //  R-11 — draft / post lifecycle (also R-03)
  // ============================================================

  async draftReceipt(input: DraftVezneReceiptInput, user: AuthUser) {
    if (input.tryAmount <= 0 || input.foreignAmount <= 0 || input.rate <= 0) {
      throw new BadRequestException('Amounts and rate must be positive');
    }
    return this.prisma.$transaction(async (tx) => {
      const drawer = await tx.cashDrawer.findFirst({
        where: { branchId: input.branchId, deletedAt: null },
      });
      if (!drawer) throw new NotFoundException('Cash drawer not found for branch');
      const receiptNo = await this.allocateReceiptNo(tx, input.branchId, new Date());
      const receipt = await tx.vezneReceipt.create({
        data: {
          branchId: input.branchId,
          cashDrawerId: drawer.id,
          userId: user.id,
          receiptNo,
          receiptType: input.receiptType as ReceiptType,
          currencyCode: input.currencyCode,
          foreignAmount: input.foreignAmount,
          rate: input.rate,
          tryAmount: input.tryAmount,
          customerId: input.customerId,
          customerName: input.customerName,
          description: input.description,
          status: 'DRAFT',
        },
      });
      // R-03: draft -> no customer movement yet (muhasebeleşmemiz lazım)
      return receipt;
    });
  }

  async postReceipt(input: PostVezneReceiptInput) {
    return this.prisma.$transaction(async (tx) => {
      const r = await tx.vezneReceipt.findFirst({
        where: { id: input.receiptId, deletedAt: null },
      });
      if (!r) throw new NotFoundException('Receipt not found');
      if (r.status === 'POSTED') return r;
      if (r.status !== 'DRAFT') {
        throw new BadRequestException(
          `Only DRAFT receipts can be posted (current: ${r.status})`,
        );
      }
      const updated = await tx.vezneReceipt.update({
        where: { id: r.id },
        data: { status: 'POSTED', postedAt: new Date() },
      });
      const user: AuthUser = { id: updated.userId } as AuthUser;
      await this.createCustomerMovementsForReceipt(tx, updated, user);
      // R-07 + R-06 post sonrası
      await this.taxProfile.computeAndPost(
        tx,
        {
          id: updated.id,
          branchId: updated.branchId,
          currencyCode: updated.currencyCode,
          tryAmount: Number(updated.tryAmount),
        },
        user,
      );
      await this.applyRateDifference(tx, updated, user);
      return updated;
    });
  }

  // ============================================================
  //  R-09 — correct (ters cash + ters customer)
  // ============================================================

  async correctReceipt(input: CorrectVezneReceiptInput, user: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const original = await tx.vezneReceipt.findFirst({
        where: { id: input.receiptId, deletedAt: null },
      });
      if (!original) throw new NotFoundException('Receipt not found');
      if (original.status === 'CORRECTED') {
        throw new BadRequestException('Already corrected');
      }
      if (original.status === 'VOIDED') {
        throw new BadRequestException('Cannot correct a voided receipt');
      }

      // R-09: eski customer hareketlerini ters çevir
      await this.reverseCustomerMovementsForReceipt(
        tx,
        original,
        user,
        'DÜZELTME',
      );
      // R-09 + R-06/R-07: R-06 kur farkı ve R-07 vergi voucher'larını ters çevir
      await this.reverseAccountingForReceipt(tx, original, user, 'DÜZELTME');

      const reverseReceiptNo = await this.allocateReceiptNo(
        tx,
        original.branchId,
        new Date(),
      );
      const reverseType =
        original.receiptType === 'BUY' ? 'SELL' : ('BUY' as ReceiptType);
      const reverse = await tx.vezneReceipt.create({
        data: {
          branchId: original.branchId,
          cashDrawerId: original.cashDrawerId,
          userId: user.id,
          receiptNo: reverseReceiptNo,
          receiptType: reverseType,
          currencyCode: original.currencyCode,
          foreignAmount: original.foreignAmount,
          rate: original.rate,
          tryAmount: original.tryAmount,
          customerId: original.customerId,
          customerName: original.customerName,
          originalId: original.id,
          correctionReason: input.reason,
          description: `Düzeltme (ters): ${input.reason}`,
        },
      });
      // R-03: ters fiş için de cari hareket oluştur (ters yön)
      await this.createCustomerMovementsForReceipt(tx, reverse, user);

      const updatedOriginal = await tx.vezneReceipt.update({
        where: { id: original.id },
        data: { status: 'CORRECTED', correctionReason: input.reason },
      });

      if (input.foreignAmount || input.rate || input.tryAmount) {
        const correctedNo = await this.allocateReceiptNo(
          tx,
          original.branchId,
          new Date(),
        );
        const corrected = await tx.vezneReceipt.create({
          data: {
            branchId: original.branchId,
            cashDrawerId: original.cashDrawerId,
            userId: user.id,
            receiptNo: correctedNo,
            receiptType: original.receiptType,
            currencyCode: original.currencyCode,
            foreignAmount: input.foreignAmount ?? Number(original.foreignAmount),
            rate: input.rate ?? Number(original.rate),
            tryAmount: input.tryAmount ?? Number(original.tryAmount),
            originalId: original.id,
            correctionReason: input.reason,
            description: `Düzeltilmiş: ${input.reason}`,
          },
        });
        // R-03: düzeltilmiş fiş için yeni cari hareket
        await this.createCustomerMovementsForReceipt(tx, corrected, user);
        return { reversed: reverse, original: updatedOriginal, corrected };
      }
      return { reversed: reverse, original: updatedOriginal };
    });
  }

  // ============================================================
  //  R-11 — void (ters cash + ters customer)
  // ============================================================

  async voidReceipt(input: VoidVezneReceiptInput, user: AuthUser) {
    if (!input.reason || input.reason.trim().length < 3) {
      throw new BadRequestException('Void reason is required (min 3 chars)');
    }
    return this.prisma.$transaction(async (tx) => {
      const original = await tx.vezneReceipt.findFirst({
        where: { id: input.receiptId, deletedAt: null },
      });
      if (!original) throw new NotFoundException('Receipt not found');
      if (original.status === 'VOIDED') {
        throw new BadRequestException('Already voided');
      }
      if (original.status === 'CORRECTED') {
        throw new BadRequestException(
          'Cannot void a corrected receipt — its reverse already exists',
        );
      }

      // R-09: eski customer hareketlerini ters çevir
      await this.reverseCustomerMovementsForReceipt(tx, original, user, 'İPTAL');
      // R-09 + R-06/R-07: R-06 kur farkı ve R-07 vergi voucher'larını ters çevir
      await this.reverseAccountingForReceipt(tx, original, user, 'İPTAL');

      const reverseReceiptNo = await this.allocateReceiptNo(
        tx,
        original.branchId,
        new Date(),
      );
      const reverseType =
        original.receiptType === 'BUY' ? 'SELL' : ('BUY' as ReceiptType);
      const reverse = await tx.vezneReceipt.create({
        data: {
          branchId: original.branchId,
          cashDrawerId: original.cashDrawerId,
          userId: user.id,
          receiptNo: reverseReceiptNo,
          receiptType: reverseType,
          currencyCode: original.currencyCode,
          foreignAmount: original.foreignAmount,
          rate: original.rate,
          tryAmount: original.tryAmount,
          customerId: original.customerId,
          customerName: original.customerName,
          originalId: original.id,
          correctionReason: `VOID: ${input.reason}`,
          description: `İptal fişi: ${input.reason}`,
        },
      });
      // R-03: ters fişin de cari hareketi oluşur (ters yön)
      await this.createCustomerMovementsForReceipt(tx, reverse, user);

      const voided = await tx.vezneReceipt.update({
        where: { id: original.id },
        data: { status: 'VOIDED', voidReason: input.reason },
      });
      return voided;
    });
  }

  // ============================================================
  //                       List receipts
  // ============================================================

  async listReceipts(params: {
    branchId?: string;
    userId?: string;
    currencyCode?: string;
    receiptType?: ReceiptType;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    pageSize?: number;
  }) {
    const {
      branchId,
      userId,
      currencyCode,
      receiptType,
      status,
      startDate,
      endDate,
      page = 1,
      pageSize = 50,
    } = params;
    const where: Prisma.VezneReceiptWhereInput = {
      deletedAt: null,
      ...(branchId ? { branchId } : {}),
      ...(userId ? { userId } : {}),
      ...(currencyCode ? { currencyCode } : {}),
      ...(receiptType ? { receiptType } : {}),
      ...(status ? { status: status as Prisma.EnumReceiptStatusFilter['equals'] } : {}),
      ...(startDate || endDate
        ? {
            receiptDate: {
              ...(startDate ? { gte: startDate } : {}),
              ...(endDate ? { lte: endDate } : {}),
            },
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.vezneReceipt.findMany({
        where,
        include: {
          user: { select: { id: true, username: true, fullName: true } },
          cashDrawer: { select: { id: true, code: true, name: true } },
          currency: true,
          customer: { select: { id: true, fullName: true } },
        },
        orderBy: { receiptDate: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.vezneReceipt.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  // ============================================================
  //                       Transfers (R-02)
  // ============================================================

  async createTransfer(input: CreateVezneTransferInput, user: AuthUser) {
    if (input.fromCashDrawerId === input.toCashDrawerId) {
      throw new BadRequestException(
        'Source and target drawers cannot be the same',
      );
    }
    return this.prisma.$transaction(async (tx) =>
      tx.vezneTransfer.create({
        data: {
          branchId: input.branchId,
          fromDrawerId: input.fromCashDrawerId,
          toDrawerId: input.toCashDrawerId,
          currencyCode: input.currencyCode,
          amount: input.amount,
          description: input.description,
          userId: user.id,
        },
      }),
    );
  }

  async correctTransfer(id: string, reason: string, user: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const t = await tx.vezneTransfer.findFirst({
        where: { id, deletedAt: null },
      });
      if (!t) throw new NotFoundException('Transfer not found');
      return tx.vezneTransfer.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          description: `${t.description ?? ''} | Düzeltme: ${reason}`,
        },
      });
    });
  }

  async bulkTransferToMain(input: BulkTransferToMainInput, user: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const transfers = await Promise.all(
        input.items.map((item) =>
          tx.vezneTransfer.create({
            data: {
              branchId: input.branchId,
              fromDrawerId: input.fromCashDrawerId,
              currencyCode: item.currencyCode,
              amount: item.amount,
              description: input.description ?? 'Toplu transfer',
              userId: user.id,
              status: 'COMPLETED',
            },
          }),
        ),
      );
      await tx.cashTransaction.create({
        data: {
          branchId: input.branchId,
          cashAccountId: input.toCashAccountId,
          currencyCode: 'TRY',
          credit: input.items.reduce((s, i) => s + Number(i.amount), 0),
          description: input.description ?? 'Toplu transfer (TL karşılığı)',
          refType: 'BULK_TRANSFER',
          refId: transfers[0]?.id,
        },
      });
      return transfers;
    });
  }

  // ============================================================
  //    R-08 — banknote count + auto ADJUSTMENT receipt
  // ============================================================

  async banknoteCount(input: BanknoteCountInput, user: AuthUser) {
    const total = input.denominations.reduce(
      (s, d) => s + d.denomValue * d.count,
      0,
    );
    return this.prisma.$transaction(async (tx) => {
      const drawer = await tx.cashDrawer.findUnique({
        where: { id: input.cashDrawerId },
      });
      if (!drawer) throw new NotFoundException('Cash drawer not found');

      // 1) Banknote count kaydı
      const count = await tx.vezneBanknoteCount.create({
        data: {
          branchId: drawer.branchId,
          cashDrawerId: input.cashDrawerId,
          userId: user.id,
          currencyCode: input.currencyCode,
          totalAmount: total,
          breakdown: input.denominations as never,
          note: input.note,
        },
      });

      // 2) Sistem bakiyesi (POSTED + CORRECTED, drawer için, bu döviz)
      const sums = await tx.vezneReceipt.groupBy({
        by: ['receiptType'],
        where: {
          cashDrawerId: input.cashDrawerId,
          currencyCode: input.currencyCode,
          deletedAt: null,
          status: { in: ['POSTED', 'CORRECTED'] },
        },
        _sum: { foreignAmount: true },
      });

      let systemBalance = 0;
      for (const r of sums) {
        const amt = Number(r._sum.foreignAmount ?? 0);
        // BUY: büro yabancı aldı (+)  SELL: büro yabancı sattı (-)
        systemBalance += (r.receiptType === 'BUY' ? 1 : -1) * amt;
      }

      const diff = total - systemBalance; // +: fazla, -: eksik

      if (Math.abs(diff) < 0.0001) {
        // Tam tutuyor — adjustment yok
        return { count, adjustment: null, diff: 0 };
      }

      // 3) Adjustment fişi (R-08) — receiptType=ADJUSTMENT, status=POSTED.
      const absDiff = Math.abs(diff);
      const adjReceiptNo = await this.allocateReceiptNo(
        tx,
        drawer.branchId,
        new Date(),
      );
      const isExcess = diff > 0;
      const adjDescription = isExcess
        ? `Sayım farkı: ${absDiff.toFixed(2)} ${input.currencyCode} fazla`
        : `Sayım farkı: ${absDiff.toFixed(2)} ${input.currencyCode} eksik`;

      const adj = await tx.vezneReceipt.create({
        data: {
          branchId: drawer.branchId,
          cashDrawerId: input.cashDrawerId,
          userId: user.id,
          receiptNo: adjReceiptNo,
          receiptType: 'ADJUSTMENT',
          currencyCode: input.currencyCode,
          foreignAmount: absDiff,
          // 1:1 TRY değer (kasaya sayım fazlası/eksikliği etkisi TRY kısmı için bağımsız muhasebeleşir)
          rate: 1,
          tryAmount: absDiff, // 397 SAYIM FARKı hesabına TRY olarak
          description: adjDescription,
          status: 'POSTED',
          postedAt: new Date(),
        },
      });

      // 4) Accounting voucher (R-08)
      const cashAcc = await tx.accountingAccount.findUnique({
        where: { code: '100' },
      });
      const sayimFarkiAcc = await tx.accountingAccount.findUnique({
        where: { code: '397' },
      });
      if (cashAcc && sayimFarkiAcc) {
        // Voucher No: tek sequence gibi davran
        const count2 = await tx.accountingVoucher.count({});
        const voucherNo = `V-${formatYmd(new Date())}-${String(count2 + 1).padStart(5, '0')}`;
        const voucher = await tx.accountingVoucher.create({
          data: {
            branchId: drawer.branchId,
            voucherNo,
            voucherType: 'NORMAL',
            voucherDate: new Date(),
            description: adjDescription,
            totalDebit: absDiff,
            totalCredit: absDiff,
            userId: user.id,
            postedAt: new Date(),
            lines: {
              create: [
                // Eksik (gider): 100 KASA borç / 397 alacak
                // Fazla (gelir): 397 borç / 100 alacak
                isExcess
                  ? {
                      accountId: sayimFarkiAcc.id,
                      currencyCode: 'TRY',
                      debit: absDiff,
                      credit: 0,
                      description: adjDescription,
                    }
                  : {
                      accountId: cashAcc.id,
                      currencyCode: 'TRY',
                      debit: absDiff,
                      credit: 0,
                      description: adjDescription,
                    },
                isExcess
                  ? {
                      accountId: cashAcc.id,
                      currencyCode: 'TRY',
                      debit: 0,
                      credit: absDiff,
                      description: adjDescription,
                    }
                  : {
                      accountId: sayimFarkiAcc.id,
                      currencyCode: 'TRY',
                      debit: 0,
                      credit: absDiff,
                      description: adjDescription,
                    },
              ],
            },
          },
        });

        return { count, adjustment: adj, diff, voucher };
      }

      return { count, adjustment: adj, diff };
    });
  }

  // ============================================================
  //                Monitor / balances (R-02)
  // ============================================================

  async monitor(branchId: string) {
    const drawers = await this.prisma.cashDrawer.findMany({
      where: { branchId, deletedAt: null },
    });
    const result: Array<{
      drawerId: string;
      code: string;
      name: string;
      status: string;
      userName: string | null;
      balances: Array<{
        currencyCode: string;
        foreignBalance: number;
        tryBalance: number;
      }>;
    }> = [];

    for (const d of drawers) {
      const receipts = await this.prisma.vezneReceipt.groupBy({
        by: ['currencyCode', 'receiptType'],
        where: {
          cashDrawerId: d.id,
          deletedAt: null,
          status: { in: ['POSTED', 'CORRECTED'] },
          receiptType: { in: ['BUY', 'SELL'] },
        },
        _sum: { foreignAmount: true, tryAmount: true },
      });

      const balances: Record<
        string,
        { foreignBalance: number; tryBalance: number }
      > = {};
      for (const r of receipts) {
        if (!balances[r.currencyCode])
          balances[r.currencyCode] = { foreignBalance: 0, tryBalance: 0 };
        const sign = r.receiptType === 'BUY' ? 1 : -1; // BUY: büro yabancı alır, TRY çıkar
        balances[r.currencyCode].foreignBalance +=
          sign * Number(r._sum.foreignAmount ?? 0);
        balances[r.currencyCode].tryBalance +=
          -sign * Number(r._sum.tryAmount ?? 0);
      }

      result.push({
        drawerId: d.id,
        code: d.code,
        name: d.name,
        status: d.status,
        userName: null,
        balances: Object.entries(balances).map(([code, b2]) => ({
          currencyCode: code,
          ...b2,
        })),
      });
    }

    return result;
  }

  async balances(branchId: string, currencyCode?: string) {
    const where = {
      branchId,
      deletedAt: null,
      status: { in: ['POSTED', 'CORRECTED'] as never },
      receiptType: { in: ['BUY', 'SELL'] as never },
      ...(currencyCode ? { currencyCode } : {}),
    };
    const items = await this.prisma.vezneReceipt.groupBy({
      by: ['currencyCode'],
      where,
      _sum: { foreignAmount: true, tryAmount: true },
    });
    return items.map((i) => ({
      currencyCode: i.currencyCode,
      totalForeign: Number(i._sum.foreignAmount ?? 0),
      totalTry: Number(i._sum.tryAmount ?? 0),
    }));
  }

  listDrawers(branchId: string) {
    return this.prisma.cashDrawer.findMany({
      where: { branchId, deletedAt: null },
      orderBy: { code: 'asc' },
    });
  }
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function startOfUtcDay(d: Date): Date {
  const x = new Date(d);
  return new Date(
    Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate()),
  );
}

function formatYmd(d: Date): string {
  const x = new Date(d);
  const y = x.getUTCFullYear();
  const m = String(x.getUTCMonth() + 1).padStart(2, '0');
  const day = String(x.getUTCDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

export type { VezneReceipt };
