import { Injectable } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '@doviz/shared';
import {
  isFirstDayOfYearInBranch,
  getTodayInBranch,
  getTimezone,
} from '../../common/utils/date.util';

type Tx = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * OpeningVoucherService — R-04 + R-14
 *
 * Yılın ilk günü (1 Ocak yerel şube timezone'unda), ilk POSTED vezne fişi
 * girilirken otomatik olarak devir fişi üretir. Idempotent.
 */
@Injectable()
export class OpeningVoucherService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Yılın ilk günü mü kontrol et (UTC). Backwards-compat için.
   */
  static isFirstDayOfYear(d: Date): boolean {
    return d.getMonth() === 0 && d.getDate() === 1;
  }

  async ensureOpeningVoucher(
    tx: Tx,
    branchId: string,
    businessDate: Date,
    user: AuthUser,
    options?: { force?: boolean },
  ): Promise<string | null> {
    // Branch timezone'una göre "yerel yılın ilk günü" kontrolü
    const branch = await tx.branch.findUnique({
      where: { id: branchId },
      select: { country: true, timezone: true },
    });
    if (
      !options?.force &&
      !isFirstDayOfYearInBranch(branch, businessDate) &&
      !OpeningVoucherService.isFirstDayOfYear(businessDate)
    ) {
      return null;
    }

    // R-14 fix: year'ı branch timezone'undan al (UTC kullanma)
    const ymd = getTodayInBranch(branch).split('-'); // YYYY-MM-DD
    const year = Number(ymd[0]);
    const yearStart = new Date(Date.UTC(year, 0, 1));
    const yearEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

    // Idempotent: bu şube için bu yıl için OPENING fiş var mı?
    const existing = await tx.accountingVoucher.findFirst({
      where: {
        branchId,
        voucherType: 'OPENING',
        voucherDate: { gte: yearStart, lte: yearEnd },
      },
    });
    if (existing) return existing.id;

    // Önceki yılın bakiyelerinden devir al
    const prevYearStart = new Date(Date.UTC(year - 1, 0, 1));
    const prevYearEnd = new Date(Date.UTC(year - 1, 11, 31, 23, 59, 59, 999));

    const openingLines: Array<{
      accountCode: string;
      debit: number;
      credit: number;
      description: string;
    }> = [];

    // 100 KASA — TRY toplam (cashTransaction debit - credit)
    const cashAgg = await tx.cashTransaction.aggregate({
      where: {
        branchId,
        currencyCode: 'TRY',
        txnDate: { gte: prevYearStart, lte: prevYearEnd },
        deletedAt: null,
      },
      _sum: { debit: true, credit: true },
    });
    const cashBalance =
      Number(cashAgg._sum.debit ?? 0) - Number(cashAgg._sum.credit ?? 0);
    if (Math.abs(cashBalance) > 0.005) {
      openingLines.push({
        accountCode: '100',
        debit: cashBalance > 0 ? cashBalance : 0,
        credit: cashBalance < 0 ? -cashBalance : 0,
        description: 'Kasa devir',
      });
      openingLines.push({
        accountCode: '500',
        debit: cashBalance < 0 ? -cashBalance : 0,
        credit: cashBalance > 0 ? cashBalance : 0,
        description: 'Sermaye devir (kasa)',
      });
    }

    // 120 ALICILAR
    const custCredits = await tx.customerMovement.aggregate({
      where: {
        branchId,
        deletedAt: null,
        refType: { in: ['VEZNE_RECEIPT'] },
        movementDate: { gte: prevYearStart, lte: prevYearEnd },
        direction: 'CREDIT',
      },
      _sum: { amount: true },
    });
    const custDebits = await tx.customerMovement.aggregate({
      where: {
        branchId,
        deletedAt: null,
        refType: { in: ['VEZNE_RECEIPT'] },
        movementDate: { gte: prevYearStart, lte: prevYearEnd },
        direction: 'DEBIT',
      },
      _sum: { amount: true },
    });
    const customerBalance =
      Number(custCredits._sum.amount ?? 0) -
      Number(custDebits._sum.amount ?? 0);
    if (Math.abs(customerBalance) > 0.005) {
      openingLines.push({
        accountCode: '120',
        debit: customerBalance > 0 ? customerBalance : 0,
        credit: customerBalance < 0 ? -customerBalance : 0,
        description: 'Alıcılar devir',
      });
      openingLines.push({
        accountCode: '500',
        debit: customerBalance < 0 ? -customerBalance : 0,
        credit: customerBalance > 0 ? customerBalance : 0,
        description: 'Sermaye devir (alıcılar)',
      });
    }

    if (openingLines.length === 0) {
      return null; // devrilecek bir şey yok
    }

    const totalDebit = openingLines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = openingLines.reduce((s, l) => s + l.credit, 0);
    if (Math.abs(totalDebit - totalCredit) > 0.005) {
      // Dengesiz ise 500 SERMAYE ile otomatik dengele (simetri)
      const fark = totalDebit - totalCredit;
      if (fark > 0) {
        openingLines.push({
          accountCode: '500',
          debit: 0,
          credit: fark,
          description: 'Açılış dengeleme',
        });
      } else {
        openingLines.push({
          accountCode: '500',
          debit: -fark,
          credit: 0,
          description: 'Açılış dengeleme',
        });
      }
    }

    // Hesapları toplu resolve et
    const codes = Array.from(new Set(openingLines.map((l) => l.accountCode)));
    const accounts = await Promise.all(
      codes.map((code) => tx.accountingAccount.findUnique({ where: { code } })),
    );
    const codeToAccount: Record<string, string> = {};
    for (let i = 0; i < codes.length; i++) {
      const acc = accounts[i];
      if (acc) codeToAccount[codes[i]] = acc.id;
    }

    // Voucher no üret (Branch prefix + yıl)
    const count = await tx.accountingVoucher.count({
      where: { branchId },
    });
    const voucherNo = `OPEN-${year}-${String(count + 1).padStart(5, '0')}`;

    const voucher = await tx.accountingVoucher.create({
      data: {
        branchId,
        voucherNo,
        voucherType: 'OPENING',
        voucherDate: yearStart,
        description: `${year} yılı açılış devir fişi`,
        totalDebit: openingLines.reduce((s, l) => s + l.debit, 0),
        totalCredit: openingLines.reduce((s, l) => s + l.credit, 0),
        userId: user.id,
        postedAt: new Date(),
        lines: {
          create: openingLines.map((l) => ({
            accountId: codeToAccount[l.accountCode],
            currencyCode: 'TRY',
            debit: l.debit,
            credit: l.credit,
            description: l.description,
          })),
        },
      },
    });

    return voucher.id;
  }
}
