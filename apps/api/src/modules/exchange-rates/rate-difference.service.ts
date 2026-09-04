import { Injectable } from '@nestjs/common';
import type { PrismaClient, VezneReceipt } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '@doviz/shared';

type Tx = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * RateDifferenceService — R-06
 *
 * Her POSTED vezne fişi sonrasında, kapanış kuruna göre oluşan kur
 * farkını otomatik muhasebeleştirir:
 *
 * - BUY:  Büro yabancı aldı. Defter TRY değeri = foreignAmount * receipt.rate
 *         Gerçek TRY değeri = foreignAmount * closingSellRate
 *         Fark = gerçek - defter
 *           > 0 => KUR FARKI GİDER (656)   — büro alırken kur düştü, değeri azaldı
 *           < 0 => KUR FARKI GELİR (646)   — büro alırken kur yükseldi, değeri arttı
 *
 * - SELL: Büro yabancı sattı. Defter TRY değeri = foreignAmount * receipt.rate
 *         Gerçek TRY değeri = foreignAmount * closingBuyRate
 *         Fark = gerçek - defter
 *           > 0 => KUR FARKI GELİR (646)   — büro satarken kur yükseldi
 *           < 0 => KUR FARKI GİDER (656)   — büro satarken kur düştü
 *
 * Voucher satırları:
 *   Gelir: 120 ALICILAR borç / 646 KUR FARKI GELİR alacak (alacaklı cari, gelir tahakkuku)
 *   Gider: 656 KUR FARKI GİDER borç / 120 ALICILAR alacak
 * TRY kasa bakiyesini de 100 KASA ile yansıtabilir, ama spec ALICILAR'a
 * yazmamızı söylüyor. Pratikte TRY kasa defter değişimi muhasebeleşmediğinden
 * ALICILAR (müşteri alacağı) veya KASA seçilebilir; burada basitleştirilmiş:
 *   Gelir: 120 ALICILAR borç / 646 alacak
 *   Gider: 656 borç / 120 ALICILAR alacak
 */
@Injectable()
export class RateDifferenceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Bir fiş için kapanış kuruna göre kur farkı hesaplar ve muhasebeleştirir.
   * Çağrıldığında `tx` aktif bir transaction olmalı.
   *
   * Kapanış kuru mevcut değilse veya diff çok küçükse (< 0.005) voucher oluşturmaz.
   */
  async computeAndPost(
    tx: Tx,
    receipt: VezneReceipt,
    user: AuthUser,
    closingBuyRate?: number | null,
    closingSellRate?: number | null,
  ): Promise<{
    diff: number;
    accountCode: string;
    voucherId: string | null;
  } | null> {
    if (receipt.status !== 'POSTED') return null;

    const rate = Number(receipt.rate);
    const foreign = Number(receipt.foreignAmount);
    const defterValue = foreign * rate; // receipt.tryAmount

    // Kapanış kuru: büro yabancı aldıysa kapanış satış, sattıysa kapanış alış
    const closingRate =
      receipt.receiptType === 'BUY' ? closingSellRate : closingBuyRate;
    if (closingRate === undefined || closingRate === null) {
      // Kapanış kuru girilmemiş — bu durumda fiş oluşturmuyoruz.
      return null;
    }

    const realValue = foreign * closingRate;
    const diff = round(realValue - defterValue, 4);

    if (Math.abs(diff) < 0.005) {
      return null; // önemsiz fark
    }

    let accountCode: string;
    let debitAccountCode: string;
    let creditAccountCode: string;
    let nature: 'INCOME' | 'EXPENSE';
    if (diff > 0) {
      if (receipt.receiptType === 'SELL') {
        accountCode = '646'; // KUR FARKI GELİR
        nature = 'INCOME';
      } else {
        accountCode = '656'; // KUR FARKI GİDER (BUY)
        nature = 'EXPENSE';
      }
    } else {
      if (receipt.receiptType === 'SELL') {
        accountCode = '656'; // KUR FARKI GİDER (SELL)
        nature = 'EXPENSE';
      } else {
        accountCode = '646'; // KUR FARKI GELİR (BUY)
        nature = 'INCOME';
      }
    }

    // Muhasebe hesaplarını bul
    const diffAcc = await tx.accountingAccount.findUnique({
      where: { code: accountCode },
    });
    const counterAcc = await tx.accountingAccount.findUnique({
      where: { code: '120' },
    });
    if (!diffAcc || !counterAcc) {
      return { diff, accountCode, voucherId: null };
    }

    const absDiff = Math.abs(diff);

    // Voucher satır yönü:
    //   GELİR (646): 120 ALICILAR borç / 646 alacak
    //   GİDER  (656): 656 borç / 120 ALICILAR alacak
    if (nature === 'INCOME') {
      debitAccountCode = '120';
      creditAccountCode = accountCode;
    } else {
      debitAccountCode = accountCode;
      creditAccountCode = '120';
    }

    // Voucher no
    const today = new Date();
    const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const voucherCount = await tx.accountingVoucher.count({
      where: { branchId: receipt.branchId },
    });
    const voucherNo = `V-${ymd}-${String(voucherCount + 1).padStart(5, '0')}`;

    const voucher = await tx.accountingVoucher.create({
      data: {
        branchId: receipt.branchId,
        voucherNo,
        voucherType: 'NORMAL',
        voucherDate: new Date(),
        description: `Kur farkı muhasebesi — fiş ${receipt.receiptNo}`,
        totalDebit: absDiff,
        totalCredit: absDiff,
        userId: user.id,
        postedAt: new Date(),
        lines: {
          create: [
            {
              accountId: (await tx.accountingAccount.findUnique({
                where: { code: debitAccountCode },
              }))!.id,
              currencyCode: 'TRY',
              debit: absDiff,
              credit: 0,
              description: `Kur farkı (${nature === 'INCOME' ? 'gelir' : 'gider'})`,
            },
            {
              accountId: (await tx.accountingAccount.findUnique({
                where: { code: creditAccountCode },
              }))!.id,
              currencyCode: 'TRY',
              debit: 0,
              credit: absDiff,
              description: `Kur farkı (${nature === 'INCOME' ? 'gelir' : 'gider'})`,
            },
          ],
        },
      },
    });

    return { diff, accountCode, voucherId: voucher.id };
  }

  /** Sadece hesaplama — muhasebe fişi üretmeden diff'i döner (testler için). */
  calculate(
    receipt: VezneReceipt,
    closingBuyRate: number | null,
    closingSellRate: number | null,
  ): {
    diff: number;
    nature: 'INCOME' | 'EXPENSE';
    accountCode: string;
  } | null {
    const rate = Number(receipt.rate);
    const foreign = Number(receipt.foreignAmount);
    const closingRate =
      receipt.receiptType === 'BUY' ? closingSellRate : closingBuyRate;
    if (closingRate === undefined || closingRate === null) return null;
    const realValue = foreign * closingRate;
    const diff = round(realValue - foreign * rate, 4);
    if (Math.abs(diff) < 0.005) return null;
    let nature: 'INCOME' | 'EXPENSE';
    let accountCode: string;
    if (diff > 0) {
      if (receipt.receiptType === 'SELL') {
        accountCode = '646';
        nature = 'INCOME';
      } else {
        accountCode = '656';
        nature = 'EXPENSE';
      }
    } else {
      if (receipt.receiptType === 'SELL') {
        accountCode = '656';
        nature = 'EXPENSE';
      } else {
        accountCode = '646';
        nature = 'INCOME';
      }
    }
    return { diff, nature, accountCode };
  }
}

function round(v: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(v * f) / f;
}
