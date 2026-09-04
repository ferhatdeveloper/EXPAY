import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateCustomerInput, CreateCustomerMovementInput } from '@doviz/shared';
import { AuthUser } from '@doviz/shared';

@Injectable()
export class CustomerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * R-03: helper — per-currency customer bakiyesi.
   *
   * İmzalı tutar yaklaşımı:
   *  - TRY satırları: amount (imzalı) ile gruplanır.
   *      BUY  → TRY bakiyesi + (müşteri döviz sattı, biz TRY ödedik → müşterinin alacağı arttı)
   *      SELL → TRY bakiyesi - (müşteri döviz aldı, biz TRY aldık → müşterinin borcu arttı)
   *  - Foreign satırlar: foreignAmount (imzalı) ile gruplanır.
   *      BUY  → foreign bakiyesi - (müşteri döviz sattı, döviz bakiyesi azaldı)
   *      SELL → foreign bakiyesi + (müşteri döviz aldı, döviz bakiyesi arttı)
   *
   * `direction` alanına güvenmek yerine `refType/refId` çiftini ya da doğrudan
   * işaretli tutarı esas alıyoruz — tek satırda hem TRY hem foreign imzalı toplam.
   */
  private async computeBalances(customerId: string) {
    const movements = await this.prisma.customerMovement.groupBy({
      by: ['customerId', 'currencyCode', 'foreignCurrency'],
      where: { customerId, deletedAt: null },
      _sum: { amount: true, foreignAmount: true },
    });

    const balancesByCurrency = new Map<string, number>();

    for (const m of movements) {
      if (m.foreignCurrency) {
        // Foreign tarafı — doğrudan foreignAmount (imzalı)
        const cur = m.foreignCurrency;
        balancesByCurrency.set(
          cur,
          (balancesByCurrency.get(cur) ?? 0) + Number(m._sum.foreignAmount ?? 0),
        );
      } else {
        // TRY tarafı — amount (imzalı)
        const cur = m.currencyCode || 'TRY';
        balancesByCurrency.set(
          cur,
          (balancesByCurrency.get(cur) ?? 0) + Number(m._sum.amount ?? 0),
        );
      }
    }

    return Array.from(balancesByCurrency.entries()).map(([currencyCode, balance]) => ({
      currencyCode,
      balance,
    }));
  }

  list(branchId?: string, q?: string) {
    return this.prisma.customer.findMany({
      where: {
        deletedAt: null,
        ...(branchId ? { branchId } : {}),
        ...(q
          ? {
              OR: [
                { fullName: { contains: q, mode: 'insensitive' as const } },
                { code: { contains: q, mode: 'insensitive' as const } },
                { phone: { contains: q } },
              ],
            }
          : {}),
      },
      orderBy: { fullName: 'asc' },
    });
  }

  /** List customers with their per-currency balances (R-03). */
  async listWithBalances(branchId?: string, q?: string) {
    const customers = await this.list(branchId, q);
    const out: Array<{
      id: string;
      fullName: string;
      code: string | null;
      branchId: string;
      balances: Array<{ currencyCode: string; balance: number }>;
    }> = [];
    for (const c of customers) {
      out.push({
        id: c.id,
        fullName: c.fullName,
        code: c.code,
        branchId: c.branchId,
        balances: await this.computeBalances(c.id),
      });
    }
    return out;
  }

  async get(id: string) {
    const c = await this.prisma.customer.findFirst({
      where: { id, deletedAt: null },
    });
    if (!c) throw new NotFoundException('Customer not found');
    return c;
  }

  async getDetail(id: string) {
    const customer = await this.get(id);
    const balances = await this.computeBalances(id);
    return { ...customer, balances };
  }

  create(input: CreateCustomerInput) {
    return this.prisma.customer.create({ data: input as any });
  }

  async update(id: string, input: Partial<CreateCustomerInput>, reason?: string) {
    await this.get(id);
    // R-12: reason audit context'e set edilir (interceptor'da log'a yazılır)
    if (reason) {
      this.audit.setReason(reason);
    }
    return this.prisma.customer.update({ where: { id }, data: input as any });
  }

  async softDelete(id: string, reason?: string) {
    await this.get(id);
    // R-12: reason'ı audit context'e set et
    if (reason) {
      this.audit.setReason(reason);
    }
    return this.prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
    });
  }

  async createMovement(input: CreateCustomerMovementInput, user: AuthUser) {
    await this.get(input.customerId);
    return this.prisma.customerMovement.create({
      data: {
        branchId: input.branchId,
        customerId: input.customerId,
        userId: user.id,
        currencyCode: input.currencyCode,
        direction: input.direction,
        amount: input.amount,
        description: input.description,
      },
    });
  }

  async correctMovement(id: string, reason: string) {
    const m = await this.prisma.customerMovement.findFirst({
      where: { id, deletedAt: null },
    });
    if (!m) throw new NotFoundException('Movement not found');
    return this.prisma.customerMovement.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        description: `${m.description ?? ''} | Düzeltme: ${reason}`,
      },
    });
  }

  movements(branchId: string, customerId?: string, startDate?: Date, endDate?: Date) {
    return this.prisma.customerMovement.findMany({
      where: {
        branchId,
        deletedAt: null,
        ...(customerId ? { customerId } : {}),
        ...(startDate || endDate
          ? {
              movementDate: {
                ...(startDate ? { gte: startDate } : {}),
                ...(endDate ? { lte: endDate } : {}),
              },
            }
          : {}),
      },
      include: {
        customer: true,
        currency: true,
        user: { select: { id: true, username: true, fullName: true } },
      },
      orderBy: { movementDate: 'desc' },
    });
  }

  async balances(branchId: string) {
    const customers = await this.prisma.customer.findMany({
      where: { branchId, deletedAt: null },
    });
    const out: Array<{
      customerId: string;
      fullName: string;
      balances: Array<{ currencyCode: string; balance: number }>;
    }> = [];
    for (const c of customers) {
      out.push({
        customerId: c.id,
        fullName: c.fullName,
        balances: await this.computeBalances(c.id),
      });
    }
    return out;
  }

  async detail(customerId: string) {
    const customer = await this.get(customerId);
    const movements = await this.prisma.customerMovement.findMany({
      where: { customerId, deletedAt: null },
      include: {
        currency: true,
        user: { select: { id: true, username: true, fullName: true } },
      },
      orderBy: { movementDate: 'desc' },
    });
    const balances = await this.computeBalances(customerId);
    return { customer, movements, balances };
  }
}
