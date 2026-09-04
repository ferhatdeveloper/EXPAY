/**
 * ExchangeRatesService + DateUtil integration tests.
 * Covers R-05 (weighted average + auto closing) and R-10 (branchId required).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ExchangeRatesService,
  computeWeightedAverages,
} from '../src/modules/exchange-rates/exchange-rates.service';
import {
  getTimezone,
  startOfDayInBranch,
  endOfDayInBranch,
} from '../src/common/utils/date.util';

const mockPrisma: any = {
  currency: {
    findMany: vi.fn(async () => [
      { code: 'USD', name: 'US Dollar', symbol: '$', decimalDigits: 2, buySpread: 0, sellSpread: 0, active: true, createdAt: new Date(), updatedAt: new Date() },
      { code: 'EUR', name: 'Euro', symbol: 'EUR', decimalDigits: 2, buySpread: 0, sellSpread: 0, active: true, createdAt: new Date(), updatedAt: new Date() },
    ]),
    findUnique: vi.fn(async () => ({
      code: 'USD',
      buySpread: 0,
      sellSpread: 0,
    })),
  },
  exchangeRate: {
    findFirst: vi.fn(async () => null),
    findMany: vi.fn(async () => []),
    findUnique: vi.fn(async () => null),
    create: vi.fn(async ({ data }: any) => ({ id: 'rate-1', ...data })),
    update: vi.fn(async ({ where, data }: any) => ({ id: where.id, ...data })),
    count: vi.fn(async () => 0),
  },
  vezneReceipt: {
    findMany: vi.fn(async () => []),
  },
  rateDeviationLog: {
    create: vi.fn(),
    findMany: vi.fn(async () => []),
    count: vi.fn(async () => 0),
  },
};

mockPrisma.$transaction = vi.fn(async (arg: any) => {
  if (typeof arg === 'function') return arg(mockPrisma);
  return Promise.all(arg);
});

vi.mock('../src/prisma/prisma.service', () => ({
  PrismaService: class {
    currency = mockPrisma.currency;
    exchangeRate = mockPrisma.exchangeRate;
    vezneReceipt = mockPrisma.vezneReceipt;
    rateDeviationLog = mockPrisma.rateDeviationLog;
    $transaction = mockPrisma.$transaction;
    $use = vi.fn();
  },
}));

import { BadRequestException } from '@nestjs/common';

describe('computeWeightedAverages — R-05', () => {
  it('single BUY receipt returns its own rate', () => {
    const out = computeWeightedAverages([
      { receiptType: 'BUY', foreignAmount: 1000, rate: 32 },
    ]);
    expect(out.buy).toBe(32);
    expect(out.sell).toBe(0);
  });

  it('multiple receipts produce weighted average', () => {
    // 100 @ 30 = 3000
    // 400 @ 31 = 12400
    // Toplam foreign = 500, toplam ağırlıklı = 15400
    // Ortalama = 15400/500 = 30.8
    const out = computeWeightedAverages([
      { receiptType: 'BUY', foreignAmount: 100, rate: 30 },
      { receiptType: 'BUY', foreignAmount: 400, rate: 31 },
    ]);
    expect(out.buy).toBe(30.8);
  });

  it('foreignAmount=0 returns 0 (NaN guard)', () => {
    const out = computeWeightedAverages([
      { receiptType: 'BUY', foreignAmount: 0, rate: 32 },
      { receiptType: 'BUY', foreignAmount: 200, rate: 30 },
    ]);
    // 200 * 30 / 200 = 30
    expect(out.buy).toBe(30);
    expect(out.sell).toBe(0);
  });

  it('handles SELL separately from BUY', () => {
    const out = computeWeightedAverages([
      { receiptType: 'BUY', foreignAmount: 100, rate: 32 },
      { receiptType: 'SELL', foreignAmount: 50, rate: 33 },
    ]);
    expect(out.buy).toBe(32);
    expect(out.sell).toBe(33);
  });
});

describe('ExchangeRatesService — R-05 + R-10', () => {
  let service: ExchangeRatesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ExchangeRatesService(mockPrisma);
  });

  it('upsertAutoClosingRates writes CLOSING row per currency', async () => {
    mockPrisma.vezneReceipt.findMany.mockResolvedValue([
      { receiptType: 'BUY', foreignAmount: 100, rate: 32 },
      { receiptType: 'SELL', foreignAmount: 50, rate: 32.5 },
    ]);
    // Manuel CLOSING yok
    mockPrisma.exchangeRate.findFirst.mockResolvedValue(null);

    const written = await service.upsertAutoClosingRates(
      'b1',
      new Date('2026-09-03'),
      { id: 'u1', username: 'op' } as any,
    );
    expect(written).toBeGreaterThan(0);
    expect(mockPrisma.exchangeRate.create).toHaveBeenCalled();
    const call = mockPrisma.exchangeRate.create.mock.calls[0][0].data;
    expect(call.rateType).toBe('CLOSING');
    expect(call.note).toContain('ağırlıklı ortalama');
  });

  it('closingRatesForDate throws if branchId missing (R-10)', async () => {
    await expect(
      service.closingRatesForDate('', new Date()),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.closingRatesForDate(undefined as any, new Date()),
    ).rejects.toThrow(BadRequestException);
  });

  it('currentFree throws if branchId missing (R-10)', async () => {
    await expect(service.currentFree('')).rejects.toThrow(BadRequestException);
    await expect(
      service.currentFree(undefined as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('getRateHistory throws if branchId missing (R-10)', async () => {
    await expect(
      service.getRateHistory(
        '',
        new Date('2026-01-01'),
        new Date('2026-12-31'),
      ),
    ).rejects.toThrow(BadRequestException);
  });
});

// ===============================================================
// R-13 — Rate source + lock
// ===============================================================

describe('ExchangeRatesService — R-13 source + lock', () => {
  let service: ExchangeRatesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ExchangeRatesService(mockPrisma);
  });

  it('upsert enteredBy, enteredAt, source set eder', async () => {
    mockPrisma.currency.findUnique.mockResolvedValue({ code: 'USD' });
    mockPrisma.exchangeRate.findFirst.mockResolvedValue(null);
    mockPrisma.exchangeRate.create.mockImplementation(
      async ({ data }: any) => ({ id: 'rate-1', ...data }),
    );

    const r = await service.upsert(
      {
        branchId: 'b1',
        currencyCode: 'USD' as never,
        rateType: 'FREE' as never,
        buyRate: 32,
        sellRate: 32.5,
      },
      { id: 'u1', username: 'op' } as any,
    );

    expect(mockPrisma.exchangeRate.create).toHaveBeenCalledTimes(1);
    const data = mockPrisma.exchangeRate.create.mock.calls[0][0].data;
    expect(data.enteredBy).toBe('u1');
    expect(data.enteredAt).toBeInstanceOf(Date);
    expect(data.source).toBe('FREE');
  });

  it('upsertAutoClosingRates source=CLOSING olarak yazar', async () => {
    mockPrisma.vezneReceipt.findMany.mockResolvedValue([
      { receiptType: 'BUY', foreignAmount: 100, rate: 32 },
    ]);
    mockPrisma.exchangeRate.findFirst.mockResolvedValue(null);
    mockPrisma.exchangeRate.create.mockImplementation(
      async ({ data }: any) => ({ id: 'rate-1', ...data }),
    );

    await service.upsertAutoClosingRates(
      'b1',
      new Date('2026-09-03'),
      { id: 'u1' } as any,
    );

    const data = mockPrisma.exchangeRate.create.mock.calls[0][0].data;
    expect(data.source).toBe('CLOSING');
    expect(data.enteredBy).toBe('u1');
    expect(data.enteredAt).toBeInstanceOf(Date);
  });

  it('upsert: locked rate update edilemez', async () => {
    mockPrisma.currency.findUnique.mockResolvedValue({ code: 'USD' });
    // Latest rate is locked
    mockPrisma.exchangeRate.findFirst.mockResolvedValue({
      id: 'prev-1',
      isLocked: true,
      buyRate: 32,
      sellRate: 32.5,
    });

    await expect(
      service.upsert(
        {
          branchId: 'b1',
          currencyCode: 'USD' as never,
          rateType: 'FREE' as never,
          buyRate: 33,
          sellRate: 33.5,
        },
        { id: 'u1' } as any,
      ),
    ).rejects.toThrow(/locked/i);
    expect(mockPrisma.exchangeRate.create).not.toHaveBeenCalled();
  });

  it('lockRate endpoint isLocked=true yapar', async () => {
    mockPrisma.exchangeRate.findUnique.mockImplementation(async (args: any) => {
      if (args.where.id === 'r-locked') {
        return { id: 'r-locked', isLocked: true };
      }
      return { id: 'r-unlocked', isLocked: false };
    });
    mockPrisma.exchangeRate.update.mockImplementation(async ({ where, data }: any) => ({
      id: where.id,
      ...data,
    }));

    const out = await service.lockRate('r-unlocked', { id: 'u1' } as any);
    expect(out.isLocked).toBe(true);
    expect(mockPrisma.exchangeRate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'r-unlocked' },
        data: expect.objectContaining({ isLocked: true }),
      }),
    );

    // Already locked -> no update
    mockPrisma.exchangeRate.update.mockClear();
    const out2 = await service.lockRate('r-locked', { id: 'u1' } as any);
    expect(out2.isLocked).toBe(true);
    expect(mockPrisma.exchangeRate.update).not.toHaveBeenCalled();
  });
});

describe('DateUtil — R-14', () => {
  it('TR returns Europe/Istanbul timezone', () => {
    expect(getTimezone('TR')).toBe('Europe/Istanbul');
  });

  it('IQ returns Asia/Baghdad timezone', () => {
    expect(getTimezone('IQ')).toBe('Asia/Baghdad');
  });

  it('startOfDayInBranch for TR returns local-midnight Date', () => {
    const branch = { country: 'TR', timezone: 'Europe/Istanbul' };
    const d = startOfDayInBranch(branch, new Date('2026-09-03T15:00:00Z'));
    expect(d).toBeInstanceOf(Date);
    // Beklenen: 2026-09-03 tarihinin local midnight'i
    // Istanbul UTC+3, local midnight = UTC 21:00 önceki gün
    // ISO: 2026-09-02T21:00:00.000Z
    expect(d.toISOString()).toBe('2026-09-02T21:00:00.000Z');
  });

  it('startOfDayInBranch for IQ returns local-midnight Date', () => {
    const branch = { country: 'IQ', timezone: 'Asia/Baghdad' };
    const d = startOfDayInBranch(branch, new Date('2026-09-03T15:00:00Z'));
    // Baghdad UTC+3, aynı şekilde 2026-09-02T21:00:00.000Z
    expect(d.toISOString()).toBe('2026-09-02T21:00:00.000Z');
  });

  it('endOfDayInBranch returns next-day local 23:59:59', () => {
    const branch = { country: 'TR', timezone: 'Europe/Istanbul' };
    const start = startOfDayInBranch(branch, new Date('2026-09-03T15:00:00Z'));
    const end = endOfDayInBranch(branch, new Date('2026-09-03T15:00:00Z'));
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000 - 1);
  });
});
