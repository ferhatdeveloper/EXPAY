import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface RangeParams {
  branchId?: string;
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  currencyCode?: string;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // R-10: branchId zorunlu kontrolü
  private requireBranchId(branchId: string | undefined | null, op: string): string {
    if (!branchId) {
      throw new BadRequestException(
        `branchId is required for ${op} (R-10: branch isolation)`,
      );
    }
    return branchId;
  }

  // ===== Fiş Listeleme =====
  receiptList(p: RangeParams) {
    return this.prisma.vezneReceipt.findMany({
      where: {
        deletedAt: null,
        ...(p.branchId ? { branchId: p.branchId } : {}),
        ...(p.userId ? { userId: p.userId } : {}),
        ...(p.currencyCode ? { currencyCode: p.currencyCode } : {}),
        ...(p.startDate || p.endDate
          ? { receiptDate: { ...(p.startDate ? { gte: p.startDate } : {}), ...(p.endDate ? { lte: p.endDate } : {}) } }
          : {}),
      },
      include: { user: { select: { id: true, username: true, fullName: true } }, currency: true, cashDrawer: true },
      orderBy: { receiptDate: 'desc' },
    });
  }

  // ===== Günlük Fiş Detay =====
  async dailyDetail(p: RangeParams) {
    const receipts = await this.receiptList(p);
    const grouped: Record<string, typeof receipts> = {};
    for (const r of receipts) {
      const key = new Date(r.receiptDate).toISOString().slice(0, 10);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(r);
    }
    return Object.entries(grouped).map(([date, items]) => ({
      date,
      count: items.length,
      totalTry: items.reduce((s, i) => s + Number(i.tryAmount), 0),
      totalForeign: items.reduce((s, i) => s + Number(i.foreignAmount), 0),
      items,
    }));
  }

  // ===== Karlılık Raporu — branchId ZORUNLU (R-10) =====
  async profitability(p: RangeParams) {
    const branchId = this.requireBranchId(p.branchId, 'profitability');
    const receipts = await this.receiptList({ ...p, branchId });
    const closing = await this.closingRatesByBranchCurrency(branchId);
    const by: Record<string, { buyCount: number; sellCount: number; totalBuyTry: number; totalSellTry: number; profit: number }> = {};
    for (const r of receipts) {
      const key = r.currencyCode;
      if (!by[key]) by[key] = { buyCount: 0, sellCount: 0, totalBuyTry: 0, totalSellTry: 0, profit: 0 };
      if (r.receiptType === 'BUY') {
        by[key].buyCount += 1;
        by[key].totalBuyTry += Number(r.tryAmount);
        const closeSell = closing[key]?.sellRate ?? Number(r.rate);
        by[key].profit += (closeSell - Number(r.rate)) * Number(r.foreignAmount);
      } else if (r.receiptType === 'SELL') {
        by[key].sellCount += 1;
        by[key].totalSellTry += Number(r.tryAmount);
        const closeBuy = closing[key]?.buyRate ?? Number(r.rate);
        by[key].profit += (Number(r.rate) - closeBuy) * Number(r.foreignAmount);
      }
    }
    return Object.entries(by).map(([currency, v]) => ({ currency, ...v }));
  }

  // ===== Personel Değerlendirme =====
  async personnel(p: RangeParams) {
    const receipts = await this.receiptList(p);
    const by: Record<string, { userId: string; fullName: string; username: string; count: number; totalTry: number; totalForeign: number }> = {};
    for (const r of receipts) {
      const uid = r.userId;
      if (!by[uid]) by[uid] = { userId: uid, fullName: r.user.fullName, username: r.user.username, count: 0, totalTry: 0, totalForeign: 0 };
      by[uid].count += 1;
      by[uid].totalTry += Number(r.tryAmount);
      by[uid].totalForeign += Number(r.foreignAmount);
    }
    return Object.values(by);
  }

  // ===== Kasa Defteri =====
  cashLedger(p: RangeParams & { cashAccountId?: string }) {
    return this.prisma.cashTransaction.findMany({
      where: {
        deletedAt: null,
        ...(p.branchId ? { branchId: p.branchId } : {}),
        ...(p.cashAccountId ? { cashAccountId: p.cashAccountId } : {}),
        ...(p.startDate || p.endDate
          ? { txnDate: { ...(p.startDate ? { gte: p.startDate } : {}), ...(p.endDate ? { lte: p.endDate } : {}) } }
          : {}),
      },
      include: { cashAccount: true, currency: true },
      orderBy: { txnDate: 'asc' },
    });
  }

  private async closingRatesByBranchCurrency(branchId?: string): Promise<Record<string, { buyRate: number; sellRate: number }>> {
    if (!branchId) return {};
    const out: Record<string, { buyRate: number; sellRate: number }> = {};
    const currencies = await this.prisma.currency.findMany({ where: { active: true } });
    for (const c of currencies) {
      const r = await this.prisma.exchangeRate.findFirst({
        where: { branchId, currencyCode: c.code, rateType: 'CLOSING', deletedAt: null },
        orderBy: { effectiveAt: 'desc' },
      });
      out[c.code] = r ? { buyRate: Number(r.buyRate), sellRate: Number(r.sellRate) } : { buyRate: 0, sellRate: 0 };
    }
    return out;
  }
}