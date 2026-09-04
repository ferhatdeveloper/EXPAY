import { Injectable } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser, TaxCountry } from '@doviz/shared';

type Tx = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * TaxProfileService — R-07
 *
 * TR (BSMV/KDV) ve IQ (CBK) için vergi profili yönetimi.
 *
 * Türkiye (TR):
 *  - BSMV (Banka ve Sigorta Muameleleri Vergisi): binde 1 — döviz alım-satımında uygulanır
 *  - KDV (Katma Değer Vergisi): kambiyo mukavelelerinde muaf, "diğer" işlemlerde var
 *  - Hesap: 360 ÖDE.VERGİ
 *
 * Irak (IQ):
 *  - CBK (Central Bank of Kurdistan-style commission/tax): yüzdelik
 *  - Hesap: 360 ÖDE.VERGİ veya 361 (ülke-özgü)
 *
 * VoucherLine olarak 360 hesabına yazılır.
 */
@Injectable()
export class TaxProfileService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ülke+currency bazlı vergi profili yükle. Yoksa default 0 oranlı döner
   * (muafiyet uygulanır).
   */
  async getProfile(country: TaxCountry, currencyCode: string) {
    const profile = await this.prisma.taxProfile.findUnique({
      where: { country_currencyCode: { country, currencyCode } },
    });
    if (profile) {
      return {
        country: profile.country,
        currencyCode: profile.currencyCode,
        bsmvRate: Number(profile.bsmvRate),
        kdvRate: Number(profile.kdvRate),
        cbkRate: Number(profile.cbkRate),
        minAmount: Number(profile.minAmount),
        exempted: profile.exempted,
        active: profile.active,
      };
    }
    return {
      country,
      currencyCode,
      bsmvRate: 0,
      kdvRate: 0,
      cbkRate: 0,
      minAmount: 0,
      exempted: true,
      active: false,
    };
  }

  /**
   * Fiş için vergi satırları üretir (tx içinde) ve `360` hesabına voucher line
   * yazar. Döndürülen `lines` öğelerinde: `accountCode`, `debit`, `credit`,
   * `description`, `taxType` ('BSMV' | 'KDV' | 'CBK').
   *
   * - amount > minAmount && !exempted ise uygula
   * - TR: BSMV binde → amount * bsmvRate / 1000
   * - TR: KDV yüzde → amount * kdvRate / 100 (eğer uygulanıyorsa)
   * - IQ: CBK yüzde → amount * cbkRate / 100
   */
  async computeAndPost(
    tx: Tx,
    receipt: {
      id: string;
      branchId: string;
      currencyCode: string;
      tryAmount: number | { toNumber: () => number } | string;
      taxCountry?: TaxCountry;
      taxExempted?: boolean;
    },
    user: AuthUser,
  ): Promise<
    Array<{
      taxType: 'BSMV' | 'KDV' | 'CBK';
      rate: number;
      amount: number;
      accountCode: string;
      description: string;
      voucherId: string | null;
    }>
  > {
    const country = (receipt.taxCountry as TaxCountry) || 'TR';
    const profile = await this.getProfile(country, receipt.currencyCode);
    const out: Array<{
      taxType: 'BSMV' | 'KDV' | 'CBK';
      rate: number;
      amount: number;
      accountCode: string;
      description: string;
      voucherId: string | null;
    }> = [];

    if (
      receipt.taxExempted ||
      profile.exempted ||
      !profile.active ||
      profile.minAmount === 0
    ) {
      // Profile olmadığı veya exempted ise hiçbir şey yapma
    }

    const tryAmount = Number(receipt.tryAmount);
    if (
      profile.active &&
      !receipt.taxExempted &&
      !profile.exempted &&
      tryAmount >= profile.minAmount &&
      tryAmount > 0
    ) {
      if (country === 'TR' && profile.bsmvRate > 0) {
        const tax = roundDec(tryAmount * (profile.bsmvRate / 1000), 4);
        out.push({
          taxType: 'BSMV',
          rate: profile.bsmvRate,
          amount: tax,
          accountCode: '360',
          description: `BSMV (${profile.bsmvRate} ‰)`,
          voucherId: await this.postTaxLine(
            tx,
            receipt,
            user,
            'BSMV',
            tax,
            `BSMV (${profile.bsmvRate} ‰) — fiş ${receipt.id}`,
          ),
        });
      }
      if (country === 'TR' && profile.kdvRate > 0) {
        const tax = roundDec(tryAmount * (profile.kdvRate / 100), 4);
        out.push({
          taxType: 'KDV',
          rate: profile.kdvRate,
          amount: tax,
          accountCode: '360',
          description: `KDV (${profile.kdvRate} %)`,
          voucherId: await this.postTaxLine(
            tx,
            receipt,
            user,
            'KDV',
            tax,
            `KDV (${profile.kdvRate} %) — fiş ${receipt.id}`,
          ),
        });
      }
      if (country === 'IQ' && profile.cbkRate > 0) {
        const tax = roundDec(tryAmount * (profile.cbkRate / 100), 4);
        out.push({
          taxType: 'CBK',
          rate: profile.cbkRate,
          amount: tax,
          accountCode: '360',
          description: `CBK (${profile.cbkRate} %)`,
          voucherId: await this.postTaxLine(
            tx,
            receipt,
            user,
            'CBK',
            tax,
            `CBK (${profile.cbkRate} %) — fiş ${receipt.id}`,
          ),
        });
      }
    }

    return out;
  }

  /**
   * Vergi satırı `360 ÖDE.VERGİ` hesabına voucherLine olarak yazılır.
   * Karşılık: 100 KASA alacak (TRY kasa çıkışı).
   */
  private async postTaxLine(
    tx: Tx,
    receipt: { id: string; branchId: string },
    user: AuthUser,
    taxType: 'BSMV' | 'KDV' | 'CBK',
    amount: number,
    description: string,
  ): Promise<string | null> {
    const acc360 = await tx.accountingAccount.findUnique({
      where: { code: '360' },
    });
    const acc100 = await tx.accountingAccount.findUnique({
      where: { code: '100' },
    });
    if (!acc360 || !acc100) return null;

    const today = new Date();
    const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const voucherCount = await tx.accountingVoucher.count({
      where: { branchId: receipt.branchId },
    });
    const voucherNo = `V-${ymd}-${String(voucherCount + 1).padStart(5, '0')}-${taxType}`;

    const voucher = await tx.accountingVoucher.create({
      data: {
        branchId: receipt.branchId,
        voucherNo,
        voucherType: 'NORMAL',
        voucherDate: new Date(),
        description,
        totalDebit: amount,
        totalCredit: amount,
        userId: user.id,
        postedAt: new Date(),
        lines: {
          create: [
            // 360 ÖDE.VERGİ borç (peşin ödeme)
            {
              accountId: acc360.id,
              currencyCode: 'TRY',
              debit: amount,
              credit: 0,
              description: `${taxType} vergi tahakkuku`,
            },
            // 100 KASA alacak
            {
              accountId: acc100.id,
              currencyCode: 'TRY',
              debit: 0,
              credit: amount,
              description: `${taxType} vergi ödemesi`,
            },
          ],
        },
      },
    });

    return voucher.id;
  }
}

function roundDec(v: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(v * f) / f;
}
