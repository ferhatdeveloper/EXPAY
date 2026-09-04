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
   * Ülke+currency bazlı vergi profili yükle.
   *
   * `country` açıkça verilmemişse `branchId` üzerinden branch.country çıkarılır.
   * Hiçbir şekilde ülke türetilemiyorsa null döner (default profile YOK — caller
   * vergi yazmamalı).
   */
  async getProfile(input: {
    branchId?: string;
    country?: TaxCountry | string;
    currencyCode: string;
  }) {
    let country = input.country as TaxCountry | string | undefined;
    if (!country && input.branchId) {
      const branch = await this.prisma.branch.findUnique({
        where: { id: input.branchId },
      });
      country = branch?.country;
    }
    if (!country) {
      // fallback: ülke türetilemedi → profil uygulanamaz
      return null;
    }
    const profile = await this.prisma.taxProfile.findUnique({
      where: {
        country_currencyCode: { country: country as TaxCountry, currencyCode: input.currencyCode },
      },
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
    // Profile satırı yoksa default muaf profile dön
    return {
      country: country as TaxCountry,
      currencyCode: input.currencyCode,
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
    // Ülke: input.taxCountry varsa onu kullan, yoksa branch.country çıkar.
    let country = receipt.taxCountry as TaxCountry | undefined;
    if (!country) {
      const branch = await tx.branch.findUnique({
        where: { id: receipt.branchId },
        select: { country: true },
      });
      country = (branch?.country as TaxCountry | undefined) ?? undefined;
    }
    const profile = await this.getProfile({
      branchId: receipt.branchId,
      country,
      currencyCode: receipt.currencyCode,
    });
    const out: Array<{
      taxType: 'BSMV' | 'KDV' | 'CBK';
      rate: number;
      amount: number;
      accountCode: string;
      description: string;
      voucherId: string | null;
    }> = [];

    // Profile türetilemediyse vergi yazma
    if (!profile) {
      return out;
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
          // IQ CBK için ülkeye özgü muhasebe hesabı
          accountCode: '361',
          description: `CBK (${profile.cbkRate} %)`,
          voucherId: await this.postTaxLine(
            tx,
            receipt,
            user,
            'CBK',
            tax,
            `CBK (${profile.cbkRate} %) — fiş ${receipt.id}`,
            '361',
          ),
        });
      }
    }

    return out;
  }

  /**
   * Vergi satırı `360 ÖDE.VERGİ` (TR) veya `361` (IQ CBK) hesabına voucherLine olarak
   * yazılır. Karşılık: 100 KASA alacak (TRY kasa çıkışı).
   */
  private async postTaxLine(
    tx: Tx,
    receipt: { id: string; branchId: string },
    user: AuthUser,
    taxType: 'BSMV' | 'KDV' | 'CBK',
    amount: number,
    description: string,
    accountCode: string = '360',
  ): Promise<string | null> {
    const accTax = await tx.accountingAccount.findUnique({
      where: { code: accountCode },
    });
    const acc100 = await tx.accountingAccount.findUnique({
      where: { code: '100' },
    });
    if (!accTax || !acc100) return null;

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
            // vergi hesabı borç (peşin ödeme)
            {
              accountId: accTax.id,
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
