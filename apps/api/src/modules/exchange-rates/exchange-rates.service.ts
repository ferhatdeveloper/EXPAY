import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { RateSource } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrencyCode, UpsertExchangeRateInput } from '@doviz/shared';
import { AuthUser } from '@doviz/shared';

const AUTO_CLOSING_LOOKBACK = 20;

@Injectable()
export class ExchangeRatesService {
  constructor(private readonly prisma: PrismaService) {}

  private requireBranchId(branchId: string | undefined | null): string {
    if (!branchId || branchId.trim().length === 0) {
      throw new BadRequestException(
        'branchId is required for exchange-rates queries (R-10)',
      );
    }
    return branchId;
  }

  // ============================================================
  //  R-13 — enteredBy/enteredAt/source/isLocked
  // ============================================================

  /**
   * Bir rate güncellenmeden önce `isLocked` kontrolü. Locked rate düzeltilemez.
   */
  private async ensureNotLocked(
    rateId: string,
    action: 'update' | 'delete',
  ): Promise<void> {
    const rate = await this.prisma.exchangeRate.findUnique({
      where: { id: rateId },
    });
    if (!rate) throw new NotFoundException('Exchange rate not found');
    if (rate.isLocked) {
      throw new BadRequestException(
        `Exchange rate ${rateId} is locked and cannot be ${action}d (R-13). Unlock first.`,
      );
    }
  }

  async lockRate(rateId: string, _user: AuthUser) {
    // isLocked=true update — lock again is fine but skip if already true
    const r = await this.prisma.exchangeRate.findUnique({ where: { id: rateId } });
    if (!r) throw new NotFoundException('Exchange rate not found');
    if (r.isLocked) return r;
    return this.prisma.exchangeRate.update({
      where: { id: rateId },
      data: { isLocked: true },
    });
  }

  async unlockRate(rateId: string, _user: AuthUser) {
    const r = await this.prisma.exchangeRate.findUnique({ where: { id: rateId } });
    if (!r) throw new NotFoundException('Exchange rate not found');
    if (!r.isLocked) return r;
    return this.prisma.exchangeRate.update({
      where: { id: rateId },
      data: { isLocked: false },
    });
  }

  async upsert(input: UpsertExchangeRateInput, user: AuthUser) {
    const branchId = this.requireBranchId(input.branchId);
    const currency = await this.prisma.currency.findUnique({
      where: { code: input.currencyCode },
    });
    if (!currency) throw new BadRequestException('Unknown currency');

    const previous = await this.prisma.exchangeRate.findFirst({
      where: {
        branchId,
        currencyCode: input.currencyCode,
        rateType: input.rateType,
        deletedAt: null,
      },
      orderBy: { effectiveAt: 'desc' },
    });

    if (previous?.isLocked) {
      throw new BadRequestException(
        `Latest exchange rate for ${input.currencyCode}/${input.rateType} is locked (R-13). Unlock first.`,
      );
    }

    const effectiveAt = input.effectiveAt ?? new Date();
    const source: RateSource =
      input.rateType === 'RAW_FREE'
        ? 'RAW_FREE'
        : input.rateType === 'FREE'
          ? 'FREE'
          : 'MANUAL';

    const created = await this.prisma.exchangeRate.create({
      data: {
        branchId,
        currencyCode: input.currencyCode,
        rateType: input.rateType,
        buyRate: input.buyRate,
        sellRate: input.sellRate,
        rawBuyRate: input.rawBuyRate,
        rawSellRate: input.rawSellRate,
        effectiveAt,
        note: input.note,
        createdById: user.id,
        enteredBy: user.id,
        enteredAt: new Date(),
        source,
      },
    });

    if (previous) {
      const prevBuy = Number(previous.buyRate);
      const deviation = Number(input.buyRate) - prevBuy;
      const deviationPct = prevBuy > 0 ? (deviation / prevBuy) * 100 : 0;
      await this.prisma.rateDeviationLog.create({
        data: {
          branchId,
          currencyCode: input.currencyCode,
          rateType: input.rateType,
          previousRate: previous.buyRate,
          newRate: input.buyRate,
          deviation,
          deviationPct,
          direction: deviation >= 0 ? 'UP' : 'DOWN',
          userId: user.id,
          note: input.note,
        },
      });
    }

    return created;
  }

  async upsertRawFree(
    input: Omit<UpsertExchangeRateInput, 'rateType'> & {
      rawBuyRate: number;
      rawSellRate: number;
    },
    user: AuthUser,
  ) {
    this.requireBranchId(input.branchId);
    const currency = await this.prisma.currency.findUnique({
      where: { code: input.currencyCode },
    });
    if (!currency) throw new BadRequestException('Unknown currency');

    const buyRate = roundTo(input.rawBuyRate - Number(currency.buySpread), 6);
    const sellRate = roundTo(input.rawSellRate + Number(currency.sellSpread), 6);

    const raw = await this.upsert(
      {
        ...input,
        buyRate,
        sellRate,
        rawBuyRate: input.rawBuyRate,
        rawSellRate: input.rawSellRate,
        rateType: 'RAW_FREE' as never,
      },
      user,
    );
    const free = await this.upsert(
      {
        branchId: input.branchId,
        currencyCode: input.currencyCode,
        buyRate,
        sellRate,
        rawBuyRate: input.rawBuyRate,
        rawSellRate: input.rawSellRate,
        rateType: 'FREE' as never,
        effectiveAt: input.effectiveAt,
        note: input.note,
      },
      user,
    );
    return { raw, free };
  }

  async list(params: {
    branchId: string;
    currencyCode?: string;
    rateType?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    pageSize?: number;
  }) {
    const branchId = this.requireBranchId(params.branchId);
    const {
      currencyCode,
      rateType,
      startDate,
      endDate,
      page = 1,
      pageSize = 100,
    } = params;
    const where = {
      branchId,
      deletedAt: null,
      ...(currencyCode ? { currencyCode } : {}),
      ...(rateType ? { rateType: rateType as never } : {}),
      ...(startDate || endDate
        ? {
            effectiveAt: {
              ...(startDate ? { gte: startDate } : {}),
              ...(endDate ? { lte: endDate } : {}),
            },
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.exchangeRate.findMany({
        where,
        include: { currency: true },
        orderBy: { effectiveAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.exchangeRate.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async currentFree(branchId: string) {
    this.requireBranchId(branchId);
    const currencies = await this.prisma.currency.findMany({
      where: { active: true },
      orderBy: { code: 'asc' },
    });
    const out: Array<{
      code: string;
      buyRate: number;
      sellRate: number;
      rawBuyRate: number | null;
      rawSellRate: number | null;
      effectiveAt: Date | null;
      isLocked: boolean;
    }> = [];
    for (const c of currencies) {
      const last = await this.prisma.exchangeRate.findFirst({
        where: {
          branchId,
          currencyCode: c.code,
          rateType: 'FREE',
          deletedAt: null,
        },
        orderBy: { effectiveAt: 'desc' },
      });
      out.push({
        code: c.code,
        buyRate: last ? Number(last.buyRate) : 0,
        sellRate: last ? Number(last.sellRate) : 0,
        rawBuyRate: last?.rawBuyRate ? Number(last.rawBuyRate) : null,
        rawSellRate: last?.rawSellRate ? Number(last.rawSellRate) : null,
        effectiveAt: last?.effectiveAt ?? null,
        isLocked: last?.isLocked ?? false,
      });
    }
    return out;
  }

  async closingRatesForDate(branchId: string, date: Date) {
    this.requireBranchId(branchId);
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const currencies = await this.prisma.currency.findMany({
      where: { active: true },
    });

    const out: Array<{ code: string; buyRate: number; sellRate: number; auto: boolean }> = [];

    for (const c of currencies) {
      const manual = await this.prisma.exchangeRate.findFirst({
        where: {
          branchId,
          currencyCode: c.code,
          rateType: 'CLOSING',
          effectiveAt: { gte: start, lte: end },
          deletedAt: null,
        },
        orderBy: { effectiveAt: 'desc' },
      });
      if (manual) {
        out.push({
          code: c.code,
          buyRate: Number(manual.buyRate),
          sellRate: Number(manual.sellRate),
          auto: false,
        });
        continue;
      }
      const recent = await this.prisma.vezneReceipt.findMany({
        where: {
          branchId,
          currencyCode: c.code,
          receiptType: { in: ['BUY', 'SELL'] },
          status: { in: ['POSTED', 'CORRECTED'] },
          deletedAt: null,
        },
        orderBy: { receiptDate: 'desc' },
        take: AUTO_CLOSING_LOOKBACK,
      });

      const { buy, sell } = computeWeightedAverages(recent);

      out.push({ code: c.code, buyRate: buy, sellRate: sell, auto: true });
    }

    return out;
  }

  async upsertAutoClosingRates(
    branchId: string,
    date: Date,
    user: AuthUser,
  ): Promise<number> {
    this.requireBranchId(branchId);
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const currencies = await this.prisma.currency.findMany({
      where: { active: true },
    });
    let written = 0;

    for (const c of currencies) {
      const manual = await this.prisma.exchangeRate.findFirst({
        where: {
          branchId,
          currencyCode: c.code,
          rateType: 'CLOSING',
          effectiveAt: { gte: start, lte: end },
          deletedAt: null,
        },
      });
      if (manual) continue;

      const recent = await this.prisma.vezneReceipt.findMany({
        where: {
          branchId,
          currencyCode: c.code,
          receiptType: { in: ['BUY', 'SELL'] },
          status: { in: ['POSTED', 'CORRECTED'] },
          deletedAt: null,
        },
        orderBy: { receiptDate: 'desc' },
        take: AUTO_CLOSING_LOOKBACK,
      });

      const { buy, sell } = computeWeightedAverages(recent);
      if (buy === 0 && sell === 0) continue;

      await this.prisma.exchangeRate.create({
        data: {
          branchId,
          currencyCode: c.code,
          rateType: 'CLOSING',
          buyRate: buy,
          sellRate: sell,
          effectiveAt: end,
          note: `Otomatik kapanış (son ${recent.length} işlem ağırlıklı ortalama)`,
          createdById: user.id,
          enteredBy: user.id,
          enteredAt: new Date(),
          source: 'CLOSING',
        },
      });
      written += 1;
    }

    return written;
  }

  async getRateHistory(
    branchId: string,
    from: Date,
    to: Date,
    rateType?: string,
    currencyCode?: string,
  ) {
    this.requireBranchId(branchId);
    return this.prisma.exchangeRate.findMany({
      where: {
        branchId,
        currencyCode: currencyCode ?? undefined,
        rateType: rateType ? (rateType as never) : undefined,
        effectiveAt: { gte: from, lte: to },
        deletedAt: null,
      },
      include: { currency: true },
      orderBy: { effectiveAt: 'asc' },
    });
  }

  async closingRatesByBranchCurrency(branchId: string) {
    this.requireBranchId(branchId);
    const out: Record<string, { buyRate: number; sellRate: number }> = {};
    const currencies = await this.prisma.currency.findMany({
      where: { active: true },
    });
    for (const c of currencies) {
      const r = await this.prisma.exchangeRate.findFirst({
        where: { branchId, currencyCode: c.code, rateType: 'CLOSING', deletedAt: null },
        orderBy: { effectiveAt: 'desc' },
      });
      out[c.code] = r
        ? { buyRate: Number(r.buyRate), sellRate: Number(r.sellRate) }
        : { buyRate: 0, sellRate: 0 };
    }
    return out;
  }

  async deviationReport(params: {
    branchId?: string;
    startDate?: Date;
    endDate?: Date;
    currencyCode?: string;
    page?: number;
    pageSize?: number;
  }) {
    const branchId = params.branchId;
    if (branchId) this.requireBranchId(branchId);
    const { startDate, endDate, currencyCode, page = 1, pageSize = 100 } = params;
    const where = {
      ...(branchId ? { branchId } : {}),
      ...(currencyCode ? { currencyCode } : {}),
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate ? { gte: startDate } : {}),
              ...(endDate ? { lte: endDate } : {}),
            },
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.rateDeviationLog.findMany({
        where,
        include: {
          currency: true,
          user: { select: { id: true, username: true, fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.rateDeviationLog.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function roundTo(value: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(value * f) / f;
}

export function computeWeightedAverages(
  receipts: Array<{
    receiptType: string;
    foreignAmount: { toNumber?: () => number } | number;
    rate: { toNumber?: () => number } | number;
  }>,
): { buy: number; sell: number } {
  let buyNum = 0;
  let buyDen = 0;
  let sellNum = 0;
  let sellDen = 0;

  for (const r of receipts) {
    const fa =
      typeof r.foreignAmount === 'number'
        ? r.foreignAmount
        : r.foreignAmount?.toNumber?.() ?? Number(r.foreignAmount);
    const rt =
      typeof r.rate === 'number'
        ? r.rate
        : r.rate?.toNumber?.() ?? Number(r.rate);

    if (!Number.isFinite(fa) || fa === 0 || !Number.isFinite(rt)) continue;

    if (r.receiptType === 'BUY') {
      buyNum += fa * rt;
      buyDen += fa;
    } else if (r.receiptType === 'SELL') {
      sellNum += fa * rt;
      sellDen += fa;
    }
  }

  const buy = buyDen > 0 ? roundTo(buyNum / buyDen, 6) : 0;
  const sell = sellDen > 0 ? roundTo(sellNum / sellDen, 6) : 0;

  return { buy, sell };
}
