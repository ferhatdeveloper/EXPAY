import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateAccountingAccountInput,
  CreateAccountingVoucherInput,
  CreateFiscalYearInput,
} from '@doviz/shared';
import { AuthUser } from "@doviz/shared";

@Injectable()
export class AccountingService {
  constructor(private readonly prisma: PrismaService) {}

  // ===== Chart of accounts =====
  listAccounts(active?: boolean) {
    return this.prisma.accountingAccount.findMany({
      where: { deletedAt: null, ...(active === undefined ? {} : { active }) },
      orderBy: { code: 'asc' },
    });
  }

  async getAccount(id: string) {
    const a = await this.prisma.accountingAccount.findFirst({ where: { id, deletedAt: null } });
    if (!a) throw new NotFoundException('Account not found');
    return a;
  }

  createAccount(input: CreateAccountingAccountInput) {
    return this.prisma.accountingAccount.create({ data: input as any });
  }

  async updateAccount(id: string, input: Partial<CreateAccountingAccountInput>) {
    await this.getAccount(id);
    return this.prisma.accountingAccount.update({ where: { id }, data: input as any });
  }

  // ===== Vouchers =====
  async createVoucher(input: CreateAccountingVoucherInput, user: AuthUser) {
    const totalDebit = input.lines.reduce((s, l) => s + Number(l.debit), 0);
    const totalCredit = input.lines.reduce((s, l) => s + Number(l.credit), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      throw new BadRequestException('Voucher must be balanced (debit == credit)');
    }
    if (input.lines.length < 2) {
      throw new BadRequestException('Voucher must have at least 2 lines');
    }

    return this.prisma.$transaction(async (tx) => {
      const voucherNo = await this.nextVoucherNo(input.branchId);
      const voucher = await tx.accountingVoucher.create({
        data: {
          branchId: input.branchId,
          voucherNo,
          voucherType: input.voucherType,
          voucherDate: input.date,
          description: input.description,
          totalDebit,
          totalCredit,
          userId: user.id,
        },
      });

      for (const line of input.lines) {
        const acc = await tx.accountingAccount.findUnique({ where: { code: line.accountCode } });
        if (!acc) throw new BadRequestException(`Unknown account code: ${line.accountCode}`);
        await tx.accountingVoucherLine.create({
          data: {
            voucherId: voucher.id,
            accountId: acc.id,
            currencyCode: line.currencyCode,
            debit: line.debit,
            credit: line.credit,
            description: line.description,
          },
        });
      }
      return voucher;
    });
  }

  async correctVoucher(id: string, reason: string) {
    const v = await this.prisma.accountingVoucher.findFirst({ where: { id, deletedAt: null } });
    if (!v) throw new NotFoundException('Voucher not found');
    return this.prisma.accountingVoucher.update({
      where: { id },
      data: { deletedAt: new Date(), description: `${v.description} | Duzeltme: ${reason}` },
    });
  }

  listVouchers(branchId: string, startDate?: Date, endDate?: Date, voucherType?: string) {
    return this.prisma.accountingVoucher.findMany({
      where: {
        branchId,
        deletedAt: null,
        ...(voucherType ? { voucherType: voucherType as never } : {}),
        ...(startDate || endDate
          ? {
              voucherDate: {
                ...(startDate ? { gte: startDate } : {}),
                ...(endDate ? { lte: endDate } : {}),
              },
            }
          : {}),
      },
      include: { lines: { include: { account: true, currency: true } } },
      orderBy: { voucherDate: 'desc' },
    });
  }

  async voucherDetail(id: string) {
    const v = await this.prisma.accountingVoucher.findFirst({
      where: { id, deletedAt: null },
      include: { lines: { include: { account: true, currency: true } }, user: { select: { id: true, username: true, fullName: true } } },
    });
    if (!v) throw new NotFoundException('Voucher not found');
    return v;
  }

  // ===== Fiscal year =====
  listFiscalYears() {
    return this.prisma.fiscalYear.findMany({ orderBy: { year: 'desc' } });
  }

  createFiscalYear(input: CreateFiscalYearInput) {
    return this.prisma.fiscalYear.create({ data: input as any });
  }

  setActiveFiscalYear(branchId: string, fiscalYearId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.branchFiscalYear.updateMany({ where: { branchId, isCurrent: true }, data: { isCurrent: false } });
      return tx.branchFiscalYear.upsert({
        where: { branchId_fiscalYearId: { branchId, fiscalYearId } },
        update: { isCurrent: true },
        create: { branchId, fiscalYearId, isCurrent: true },
      });
    });
  }

  // ===== Day end =====
  async dayEnd(branchId: string, user: AuthUser, notes?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const existing = await this.prisma.dayEnd.findFirst({ where: { branchId, businessDate: today } });
    if (existing) {
      if (existing.status === 'CLOSED') throw new BadRequestException('Day already closed');
      return this.prisma.dayEnd.update({
        where: { id: existing.id },
        data: { status: 'CLOSED', closedAt: new Date(), notes },
      });
    }
    return this.prisma.dayEnd.create({
      data: {
        branchId,
        userId: user.id,
        businessDate: today,
        status: 'CLOSED',
        closedAt: new Date(),
        notes,
      },
    });
  }

  listDayEnds(branchId: string) {
    return this.prisma.dayEnd.findMany({ where: { branchId }, orderBy: { businessDate: 'desc' } });
  }

  // ===== Ledger (defter kebir) =====
  async ledger(branchId: string, accountId: string, startDate?: Date, endDate?: Date) {
    const lines = await this.prisma.accountingVoucherLine.findMany({
      where: {
        accountId,
        voucher: {
          branchId,
          deletedAt: null,
          ...(startDate || endDate
            ? {
                voucherDate: {
                  ...(startDate ? { gte: startDate } : {}),
                  ...(endDate ? { lte: endDate } : {}),
                },
              }
            : {}),
        },
      },
      include: { voucher: true, account: true, currency: true },
      orderBy: { voucher: { voucherDate: 'asc' } },
    });

    let runningBalance = 0;
    return lines.map((l) => {
      runningBalance += Number(l.debit) - Number(l.credit);
      return { ...l, runningBalance };
    });
  }

  private async nextVoucherNo(branchId: string): Promise<string> {
    const today = new Date();
    const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const count = await this.prisma.accountingVoucher.count({
      where: {
        branchId,
        createdAt: { gte: new Date(today.setHours(0, 0, 0, 0)) },
      },
    });
    return `V-${ymd}-${String(count + 1).padStart(5, '0')}`;
  }
}