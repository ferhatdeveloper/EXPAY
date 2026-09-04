import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCustomerInput, CreateCustomerMovementInput } from '@doviz/shared';
import { AuthUser } from '@doviz/shared';

@Injectable()
export class CustomerService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * R-03: helper — returns SUM(direction=customer-side bakiyesi) per currency.
   * Schema: direction='DEBIT' => customer is debited (we owe them less); CREDIT => owed more.
   * For TRY and for foreign currency separately.
   */
  private async computeBalances(customerId: string) {
    // 1. Per-currency TRY balances (or any currency explicitly used)
    const tryRows = await this.prisma.customerMovement.groupBy({
      by: ['currencyCode'],
      where: { customerId, deletedAt: null, refType: { not: 'FOREIGN' } },
      _sum: { amount: true },
    });
    const foreignRows = await this.prisma.customerMovement.groupBy({
      by: ['foreignCurrency'],
      where: {
        customerId,
        deletedAt: null,
        foreignCurrency: { not: null },
      },
      _sum: { foreignAmount: true },
    });
    const balances: Array<{
      currencyCode: string;
      balance: number;
    }> = [];
    for (const r of tryRows) {
      const credits = await this.prisma.customerMovement.aggregate({
        where: {
          customerId,
          deletedAt: null,
          currencyCode: r.currencyCode,
          direction: 'CREDIT',
          refType: { not: 'FOREIGN' },
        },
        _sum: { amount: true },
      });
      const debits = await this.prisma.customerMovement.aggregate({
        where: {
          customerId,
          deletedAt: null,
          currencyCode: r.currencyCode,
          direction: 'DEBIT',
          refType: { not: 'FOREIGN' },
        },
        _sum: { amount: true },
      });
      balances.push({
        currencyCode: r.currencyCode,
        balance: Number(credits._sum.amount ?? 0) - Number(debits._sum.amount ?? 0),
      });
    }
    const foreignBalances = foreignRows
      .filter((r) => r.foreignCurrency)
      .map((r) => ({
        currencyCode: r.foreignCurrency as string,
        balance: Number(r._sum.foreignAmount ?? 0),
      }));
    return [...balances, ...foreignBalances];
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

  async update(id: string, input: Partial<CreateCustomerInput>) {
    await this.get(id);
    return this.prisma.customer.update({ where: { id }, data: input as any });
  }

  async softDelete(id: string) {
    await this.get(id);
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
