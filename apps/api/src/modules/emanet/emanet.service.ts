import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '@doviz/shared';
import type {
  EmanetCreateInput,
  EmanetReleaseInput,
  EmanetCloseInput,
  EmanetAdjustInput,
} from './emanet.schema';

@Injectable()
export class EmanetService {
  constructor(private readonly prisma: PrismaService) {}

  /** Yeni emanet açma — DEPOSIT transaction ile birlikte atomik. */
  async create(input: EmanetCreateInput, userId: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id: input.customerId } });
    if (!customer) throw new NotFoundException('Customer not found');

    // Reference no üret — yıl bazında unique sayaç
    const yearStart = new Date(`${new Date().getFullYear()}-01-01T00:00:00Z`);
    const yearCount = await this.prisma.customerEmanet.count({
      where: { branchId: input.branchId, openedAt: { gte: yearStart } },
    });
    const referenceNo = `EMT-${new Date().getFullYear()}-${String(yearCount + 1).padStart(5, '0')}`;

    const tryValue = input.initialAmount * input.entryRate;

    return this.prisma.$transaction(async (tx) => {
      const emanet = await tx.customerEmanet.create({
        data: {
          branchId: input.branchId,
          customerId: input.customerId,
          currency: input.currency,
          kind: input.kind,
          metalType: input.metalType ?? null,
          weightGrams: input.weightGrams ?? null,
          purity: input.purity ?? null,
          initialAmount: input.initialAmount,
          currentAmount: input.initialAmount,
          unit: input.unit,
          entryRate: input.entryRate,
          entryTRYEquivalent: tryValue,
          currentTRYEquivalent: tryValue,
          storageLocation: input.storageLocation ?? null,
          vaultNumber: input.vaultNumber ?? null,
          referenceNo,
          description: input.description ?? null,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
          openedBy: userId,
          status: 'OPEN',
        },
        include: { customer: true, branch: true, opener: true },
      });

      // İlk DEPOSIT transaction
      await tx.customerEmanetTransaction.create({
        data: {
          emanetId: emanet.id,
          type: 'DEPOSIT',
          currency: input.currency,
          amount: input.initialAmount,
          rateTRY: input.entryRate,
          tryEquivalent: tryValue,
          customerId: input.customerId,
          description: `Emanet açıldı — ${referenceNo}`,
          createdBy: userId,
        },
      });

      return emanet;
    });
  }

  /** Kısmi veya tam iade (tek transaction). */
  async release(input: EmanetReleaseInput, userId: string) {
    const emanet = await this.prisma.customerEmanet.findUnique({ where: { id: input.emanetId } });
    if (!emanet) throw new NotFoundException('Emanet not found');
    if (emanet.status === 'CLOSED' || emanet.status === 'FORFEIT') {
      throw new BadRequestException(`Emanet durumu: ${emanet.status}`);
    }

    const currentAmt = Number(emanet.currentAmount);
    if (input.amount > currentAmt + 0.0001) {
      throw new BadRequestException(`İade tutarı kalan miktarı aşıyor (${currentAmt})`);
    }

    const tryEq = input.amount * input.rateTRY;
    const newCurrent = +(currentAmt - input.amount).toFixed(4);
    const isFullClose = newCurrent <= 0.0001;
    const newStatus = isFullClose ? 'CLOSED' : 'PARTIAL';

    return this.prisma.$transaction(async (tx) => {
      await tx.customerEmanetTransaction.create({
        data: {
          emanetId: emanet.id,
          type: isFullClose ? 'CLOSE' : 'RELEASE',
          currency: emanet.currency,
          amount: input.amount,
          rateTRY: input.rateTRY,
          tryEquivalent: tryEq,
          customerId: emanet.customerId,
          receiptId: input.receiptId ?? null,
          cashAccountId: input.cashAccountId ?? null,
          description: input.description ?? (isFullClose ? 'Tam iade' : 'Kısmi iade'),
          createdBy: userId,
        },
      });

      return tx.customerEmanet.update({
        where: { id: emanet.id },
        data: {
          currentAmount: isFullClose ? 0 : newCurrent,
          status: newStatus,
          closedAt: isFullClose ? new Date() : null,
          closedBy: isFullClose ? userId : null,
          closedReason: isFullClose ? input.description ?? 'Tam iade' : null,
          currentTRYEquivalent: isFullClose ? 0 : newCurrent * input.rateTRY,
        },
      });
    });
  }

  /** Tam iade (tüm bakiyeyi tek seferde kapat). */
  async close(input: EmanetCloseInput, userId: string) {
    const emanet = await this.prisma.customerEmanet.findUnique({ where: { id: input.emanetId } });
    if (!emanet) throw new NotFoundException('Emanet not found');
    const current = Number(emanet.currentAmount);
    if (current <= 0.0001) {
      throw new BadRequestException('Emanet zaten kapalı');
    }
    return this.release(
      {
        emanetId: input.emanetId,
        amount: current,
        rateTRY: input.rateTRY,
        receiptId: input.receiptId,
        cashAccountId: input.cashAccountId,
        description: input.reason ?? 'Tam iade',
      },
      userId,
    );
  }

  /** Manuel düzeltme — kayıp/hasar/sayım farkı için. Negatif değer azaltır. */
  async adjust(input: EmanetAdjustInput, userId: string) {
    const emanet = await this.prisma.customerEmanet.findUnique({ where: { id: input.emanetId } });
    if (!emanet) throw new NotFoundException('Emanet not found');
    if (emanet.status === 'CLOSED' || emanet.status === 'FORFEIT') {
      throw new BadRequestException(`Emanet durumu: ${emanet.status}`);
    }

    const currentAmt = Number(emanet.currentAmount);
    const newCurrent = +(currentAmt + input.amount).toFixed(4);
    if (newCurrent < -0.0001) {
      throw new BadRequestException('Düzeltme sonrası bakiye negatif olamaz');
    }

    const isFullClose = Math.abs(newCurrent) <= 0.0001;
    const newStatus = isFullClose ? 'CLOSED' : 'PARTIAL';
    const tryEq = Math.abs(input.amount) * input.rateTRY;

    return this.prisma.$transaction(async (tx) => {
      await tx.customerEmanetTransaction.create({
        data: {
          emanetId: emanet.id,
          type: 'ADJUST',
          currency: emanet.currency,
          amount: input.amount,
          rateTRY: input.rateTRY,
          tryEquivalent: tryEq,
          customerId: emanet.customerId,
          description: `Düzeltme: ${input.reason}`,
          createdBy: userId,
        },
      });

      return tx.customerEmanet.update({
        where: { id: emanet.id },
        data: {
          currentAmount: isFullClose ? 0 : newCurrent,
          status: newStatus,
          closedAt: isFullClose ? new Date() : null,
          closedBy: isFullClose ? userId : null,
          closedReason: isFullClose ? `Düzeltme: ${input.reason}` : null,
          currentTRYEquivalent: isFullClose ? 0 : newCurrent * input.rateTRY,
        },
      });
    });
  }

  /** Listeleme — branchId/customerId/status/currency filtresi. */
  async list(filter: { branchId?: string; customerId?: string; status?: string; currency?: string }) {
    return this.prisma.customerEmanet.findMany({
      where: {
        deletedAt: null,
        ...(filter.branchId ? { branchId: filter.branchId } : {}),
        ...(filter.customerId ? { customerId: filter.customerId } : {}),
        ...(filter.status ? { status: filter.status } : {}),
        ...(filter.currency ? { currency: filter.currency } : {}),
      },
      orderBy: { openedAt: 'desc' },
      include: { customer: true, branch: true, opener: { select: { id: true, fullName: true, username: true } } },
    });
  }

  async get(id: string) {
    const e = await this.prisma.customerEmanet.findUnique({
      where: { id },
      include: {
        customer: true,
        branch: true,
        opener: { select: { id: true, fullName: true, username: true } },
        closer: { select: { id: true, fullName: true, username: true } },
        transactions: {
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { id: true, fullName: true, username: true } } },
        },
      },
    });
    if (!e) throw new NotFoundException('Emanet not found');
    return e;
  }

  /** Müşteri açık emanetleri ve toplam TRY karşılığı. */
  async summaryByCustomer(customerId: string) {
    const items = await this.prisma.customerEmanet.findMany({
      where: { deletedAt: null, customerId, status: { in: ['OPEN', 'PARTIAL'] } },
      orderBy: { openedAt: 'desc' },
      include: {
        branch: true,
        customer: true,
      },
    });

    // Her kalem için: kalan / başlangıç oranı * başlangıç TRY değeri
    const totalTRY = items.reduce((sum, e) => {
      const ratio = Number(e.currentAmount) / Number(e.initialAmount || 1);
      return sum + Number(e.entryTRYEquivalent) * ratio;
    }, 0);

    return { items, totalTRY };
  }

  /** Şube bazlı özet — kasa emanet durumu raporu için. */
  async branchSummary(branchId: string) {
    const items = await this.prisma.customerEmanet.findMany({
      where: { deletedAt: null, branchId, status: { in: ['OPEN', 'PARTIAL'] } },
    });

    const byCurrency = new Map<string, { count: number; totalAmount: number; totalTRY: number }>();
    let grandTotalTRY = 0;

    for (const e of items) {
      const ratio = Number(e.currentAmount) / Number(e.initialAmount || 1);
      const tryVal = Number(e.entryTRYEquivalent) * ratio;
      const cur = byCurrency.get(e.currency) ?? { count: 0, totalAmount: 0, totalTRY: 0 };
      cur.count += 1;
      cur.totalAmount += Number(e.currentAmount);
      cur.totalTRY += tryVal;
      byCurrency.set(e.currency, cur);
      grandTotalTRY += tryVal;
    }

    return {
      totalCount: items.length,
      grandTotalTRY,
      byCurrency: Array.from(byCurrency.entries()).map(([currency, v]) => ({ currency, ...v })),
    };
  }
}
