import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCurrencyInput } from '@doviz/shared';

@Injectable()
export class CurrenciesService {
  constructor(private readonly prisma: PrismaService) {}

  list(active?: boolean) {
    return this.prisma.currency.findMany({
      where: active === undefined ? undefined : { active },
      orderBy: { code: 'asc' },
    });
  }

  async get(code: string) {
    const currency = await this.prisma.currency.findUnique({ where: { code } });
    if (!currency) throw new NotFoundException('Currency not found');
    return currency;
  }

  async create(input: CreateCurrencyInput) {
    return this.prisma.currency.create({
      data: {
        code: input.code,
        name: input.name,
        symbol: input.symbol,
        decimalDigits: input.decimalDigits,
        buySpread: input.buySpread,
        sellSpread: input.sellSpread,
        active: input.active,
      },
    });
  }

  async update(code: string, input: Partial<CreateCurrencyInput>) {
    await this.get(code);
    return this.prisma.currency.update({ where: { code }, data: input });
  }
}