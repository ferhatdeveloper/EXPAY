import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCashAccountInput, CreateCashMovementInput } from '@doviz/shared';
import { AuthUser } from "@doviz/shared";

@Injectable()
export class CashService {
  constructor(private readonly prisma: PrismaService) {}

  // ===== Accounts =====
  listAccounts(branchId?: string) {
    return this.prisma.cashAccount.findMany({
      where: { deletedAt: null, ...(branchId ? { branchId } : {}) },
      orderBy: [{ branchId: 'asc' }, { code: 'asc' }],
    });
  }

  async getAccount(id: string) {
    const a = await this.prisma.cashAccount.findFirst({ where: { id, deletedAt: null } });
    if (!a) throw new NotFoundException('Account not found');
    return a;
  }

  createAccount(input: CreateCashAccountInput) {
    return this.prisma.cashAccount.create({ data: input as any });
  }

  async updateAccount(id: string, input: Partial<CreateCashAccountInput>) {
    await this.getAccount(id);
    return this.prisma.cashAccount.update({ where: { id }, data: input as any });
  }

  async softDeleteAccount(id: string) {
    await this.getAccount(id);
    return this.prisma.cashAccount.update({ where: { id }, data: { deletedAt: new Date(), active: false } });
  }

  // ===== Movements =====
  async createMovement(input: CreateCashMovementInput, user: AuthUser) {
    await this.getAccount(input.cashAccountId);
    return this.prisma.$transaction(async (tx) => {
      const movement = await tx.cashMovement.create({
        data: {
          branchId: input.branchId,
          cashAccountId: input.cashAccountId,
          userId: user.id,
          currencyCode: input.currencyCode,
          direction: input.direction,
          amount: input.amount,
          description: input.description,
        },
      });

      // Mirror as ledger entry
      await tx.cashTransaction.create({
        data: {
          branchId: input.branchId,
          cashAccountId: input.cashAccountId,
          currencyCode: input.currencyCode,
          debit: input.direction === 'IN' ? input.amount : 0,
          credit: input.direction === 'OUT' ? input.amount : 0,
          description: input.description,
          refType: 'MOVEMENT',
          refId: movement.id,
        },
      });
      return movement;
    });
  }

  async correctMovement(id: string, reason: string, user: AuthUser) {
    const m = await this.prisma.cashMovement.findFirst({ where: { id, deletedAt: null } });
    if (!m) throw new NotFoundException('Movement not found');

    return this.prisma.$transaction(async (tx) => {
      await tx.cashMovement.update({
        where: { id },
        data: { deletedAt: new Date(), description: `${m.description ?? ''} | Duzeltme: ${reason}` },
      });
      // Reverse ledger
      await tx.cashTransaction.create({
        data: {
          branchId: m.branchId,
          cashAccountId: m.cashAccountId,
          currencyCode: m.currencyCode,
          debit: m.direction === 'OUT' ? Number(m.amount) : 0,
          credit: m.direction === 'IN' ? Number(m.amount) : 0,
          description: `Duzeltme: ${reason}`,
          refType: 'CORRECTION',
          refId: m.id,
        },
      });
      return { ok: true };
    });
  }

  // ===== Ledger & Balances =====
  async ledger(branchId: string, cashAccountId?: string, startDate?: Date, endDate?: Date) {
    return this.prisma.cashTransaction.findMany({
      where: {
        branchId,
        deletedAt: null,
        ...(cashAccountId ? { cashAccountId } : {}),
        ...(startDate || endDate
          ? {
              txnDate: {
                ...(startDate ? { gte: startDate } : {}),
                ...(endDate ? { lte: endDate } : {}),
              },
            }
          : {}),
      },
      include: { cashAccount: true, currency: true },
      orderBy: { txnDate: 'asc' },
    });
  }

  async balances(branchId: string, cashAccountId?: string) {
    const where = {
      branchId,
      deletedAt: null,
      ...(cashAccountId ? { cashAccountId } : {}),
    };
    const accounts = await this.prisma.cashAccount.findMany({ where: { ...where, deletedAt: null } });
    const out: Array<{ cashAccountId: string; accountName: string; balances: Array<{ currencyCode: string; balance: number }> }> = [];
    for (const acc of accounts) {
      const rows = await this.prisma.cashTransaction.groupBy({
        by: ['currencyCode'],
        where: { cashAccountId: acc.id, deletedAt: null },
        _sum: { debit: true, credit: true },
      });
      out.push({
        cashAccountId: acc.id,
        accountName: `${acc.code} - ${acc.name}`,
        balances: rows.map((r) => ({
          currencyCode: r.currencyCode,
          balance: Number(r._sum.debit ?? 0) - Number(r._sum.credit ?? 0),
        })),
      });
    }
    return out;
  }

  async detail(branchId: string, cashAccountId: string, startDate?: Date, endDate?: Date) {
    return this.ledger(branchId, cashAccountId, startDate, endDate);
  }

  async listMovements(branchId: string, startDate?: Date, endDate?: Date) {
    return this.prisma.cashMovement.findMany({
      where: {
        branchId,
        deletedAt: null,
        ...(startDate || endDate
          ? {
              movementDate: {
                ...(startDate ? { gte: startDate } : {}),
                ...(endDate ? { lte: endDate } : {}),
              },
            }
          : {}),
      },
      include: { cashAccount: true, currency: true, user: { select: { id: true, fullName: true, username: true } } },
      orderBy: { movementDate: 'desc' },
    });
  }
}