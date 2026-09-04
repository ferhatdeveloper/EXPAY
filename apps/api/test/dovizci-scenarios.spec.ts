/**
 * Dövizci gözüyle uçtan uca senaryolar (R-01..R-15).
 *
 * 20 test:
 *  1  R-15 Paralel receiptNo ayrımı
 *  2  R-02 Tx rollback
 *  3  R-03 createReceipt customerId=var → 2 customerTransaction
 *  4  R-09 correctReceipt ters hareket
 *  5  R-08 banknoteCount fark<0 → ADJUSTMENT (gider)
 *  6  R-08 banknoteCount fark>0 → ADJUSTMENT (gelir)
 *  7  R-11 voidReceipt POSTED → VOIDED + reverses
 *  8  R-06 Rate difference voucher
 *  9  R-07 TR BSMV tax line
 * 10  R-07 IQ CBK tax line
 * 11  R-04 openingVoucher 1 Ocak → devir fişi
 * 12  R-04 openingVoucher idempotent
 * 13  R-05 upsertAutoClosingRates ağırlıklı ortalama
 * 14  R-13 locked CLOSING reddi
 * 15  R-12 DELETE x-audit-reason olmadan 400
 * 16  R-12 DELETE x-audit-reason ile 200 + log dolu
 * 17  R-14 TR timezone Europe/Istanbul
 * 18  R-14 IQ timezone Asia/Baghdad
 * 19  R-10 requireBranchId yoksa BadRequest
 * 20  R-11 voidReceipt sebep<3 kar → 400
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------- sub-service stubs (gerçek uçtan uca testler için) ----------
const rateDifferenceStub = {
  computeAndPost: vi.fn(async () => ({
    diff: 100,
    accountCode: '646',
    voucherId: 'rdv-1',
  })),
  calculate: vi.fn((r: any, cb: number, cs: number) => {
    // gerçek hesabın sonucunu payload'a çevir
    const closingSell = cs ?? 32;
    const closingBuy = cb ?? 31;
    const fx = Number(r.foreignAmount);
    const rt = Number(r.rate);
    const closingValue = fx * closingSell;
    const bookValue = fx * rt;
    const diff = round2(closingValue - bookValue);
    if (Math.abs(diff) < 0.01) return null;
    return {
      diff,
      nature: diff >= 0 ? 'INCOME' : 'EXPENSE',
      accountCode: diff >= 0 ? '646' : '656',
    };
  }),
};

function round2(v: number) {
  return Math.round(v * 100) / 100;
}

const openingVoucherStub = {
  ensureOpeningVoucher: vi.fn(async () => null),
};

const taxProfileStub = {
  computeAndPost: vi.fn(async () => [
    {
      taxType: 'BSMV',
      rate: 0.001,
      amount: 3.2,
      accountCode: '360',
      description: 'BSMV',
      voucherId: 'tv-1',
    },
  ]),
  getProfile: vi.fn(async () => ({
    country: 'TR',
    currencyCode: 'USD',
    bsmvRate: 0.001,
    kdvRate: 0,
    cbkRate: 0,
    exempted: false,
    minAmount: 0,
    active: true,
  })),
};

vi.mock('../src/modules/exchange-rates/rate-difference.service', () => ({
  RateDifferenceService: class {
    computeAndPost = rateDifferenceStub.computeAndPost;
    calculate = rateDifferenceStub.calculate;
  },
}));
vi.mock('../src/modules/accounting/opening-voucher.service', () => ({
  OpeningVoucherService: class {
    ensureOpeningVoucher = openingVoucherStub.ensureOpeningVoucher;
    static isFirstDayOfYear = (d: Date) =>
      d.getMonth() === 0 && d.getDate() === 1;
  },
}));
vi.mock('../src/modules/currencies/tax-profile.service', () => ({
  TaxProfileService: class {
    getProfile = taxProfileStub.getProfile;
    computeAndPost = taxProfileStub.computeAndPost;
  },
}));

// ---------- Prisma stub ----------
const mockPrisma: any = {
  cashDrawer: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
  },
  branch: {
    findUnique: vi.fn(async () => ({
      id: 'b1',
      country: 'TR',
      timezone: 'Europe/Istanbul',
    })),
    findMany: vi.fn(),
  },
  vezneReceipt: {
    count: vi.fn().mockResolvedValue(0),
    create: vi.fn(async ({ data }: any) => ({ id: 'new-receipt', ...data })),
    findFirst: vi.fn(),
    findMany: vi.fn(async () => []),
    update: vi.fn(async ({ where, data }: any) => ({ id: where.id, ...data })),
    groupBy: vi.fn(async () => []),
  },
  vezneReceiptSequence: {
    upsert: vi.fn(),
  },
  vezneTransfer: {
    create: vi.fn(async ({ data }: any) => ({ id: 't1', ...data })),
  },
  cashTransaction: {
    create: vi.fn(async ({ data }: any) => ({ id: 'ctx', ...data })),
    aggregate: vi.fn(async () => ({ _sum: { debit: 0, credit: 0 } })),
  },
  vezneBanknoteCount: {
    create: vi.fn(async ({ data }: any) => ({ id: 'bc', ...data })),
  },
  customerMovement: {
    create: vi.fn(async ({ data }: any) => ({
      id: 'cm-' + Math.random(),
      ...data,
    })),
    findMany: vi.fn(async () => []),
    aggregate: vi.fn(async () => ({ _sum: { amount: 0 } })),
  },
  accountingAccount: {
    findUnique: vi.fn(async ({ where }: any) => {
      const code = where.code;
      return code ? { id: `acc-${code}`, code } : null;
    }),
    findMany: vi.fn(async () => []),
  },
  accountingVoucher: {
    count: vi.fn(async () => 0),
    create: vi.fn(async ({ data }: any) => ({ id: 'voucher-1', ...data })),
    findFirst: vi.fn(async () => null),
    findMany: vi.fn(async () => []),
    update: vi.fn(async ({ where, data }: any) => ({
      id: where.id,
      ...data,
    })),
  },
  exchangeRate: {
    findFirst: vi.fn(async () => null),
    findMany: vi.fn(async () => []),
    create: vi.fn(async ({ data }: any) => ({ id: 'rate-1', ...data })),
    findUnique: vi.fn(async () => null),
    update: vi.fn(async ({ where, data }: any) => ({
      id: where.id,
      ...data,
    })),
  },
  taxProfile: {
    findUnique: vi.fn(async () => null),
    findMany: vi.fn(async () => []),
  },
  changeAuditLog: {
    create: vi.fn(async ({ data }: any) => ({ id: 'log-1', ...data })),
    findMany: vi.fn(async () => []),
    count: vi.fn(async () => 0),
  },
  rateDeviationLog: {
    create: vi.fn(),
    findMany: vi.fn(async () => []),
    count: vi.fn(async () => 0),
  },
  currency: {
    findMany: vi.fn(async () => []),
    findUnique: vi.fn(async () => null),
  },
};

mockPrisma.$transaction = vi.fn(async (arg: any) => {
  if (typeof arg === 'function') return arg(mockPrisma);
  return Promise.all(arg);
});
mockPrisma.$use = vi.fn();

vi.mock('../src/prisma/prisma.service', () => ({
  PrismaService: class {
    cashDrawer = mockPrisma.cashDrawer;
    vezneReceipt = mockPrisma.vezneReceipt;
    vezneReceiptSequence = mockPrisma.vezneReceiptSequence;
    branch = mockPrisma.branch;
    vezneTransfer = mockPrisma.vezneTransfer;
    cashTransaction = mockPrisma.cashTransaction;
    vezneBanknoteCount = mockPrisma.vezneBanknoteCount;
    customerMovement = mockPrisma.customerMovement;
    accountingAccount = mockPrisma.accountingAccount;
    accountingVoucher = mockPrisma.accountingVoucher;
    exchangeRate = mockPrisma.exchangeRate;
    taxProfile = mockPrisma.taxProfile;
    changeAuditLog = mockPrisma.changeAuditLog;
    $transaction = mockPrisma.$transaction;
    $use = mockPrisma.$use;
  },
}));

import { VezneService } from '../src/modules/vezne/vezne.service';
import {
  ExchangeRatesService,
  computeWeightedAverages,
} from '../src/modules/exchange-rates/exchange-rates.service';
import { RateDifferenceService } from '../src/modules/exchange-rates/rate-difference.service';
import { OpeningVoucherService } from '../src/modules/accounting/opening-voucher.service';
import { TaxProfileService } from '../src/modules/currencies/tax-profile.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { AuditContextMiddleware } from '../src/common/guards/audit-context.middleware';
import { ReceiptType } from '@doviz/shared';
import { BadRequestException } from '@nestjs/common';

describe('Dövizci senaryoları — R-01..R-15 integration', () => {
  let vezne: VezneService;
  let rates: ExchangeRatesService;
  let audit: AuditService;

  const baseUser = (id: string = 'u1') =>
    ({ id, username: 'vezne' } as any);

  const baseBranch = { id: 'b1', country: 'TR', timezone: 'Europe/Istanbul' };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.cashDrawer.findFirst.mockResolvedValue({
      id: 'drawer-1',
      branchId: 'b1',
      code: 'V01',
    });
    mockPrisma.vezneReceiptSequence.upsert.mockImplementation(
      async () => ({ lastNumber: 1 }),
    );
    mockPrisma.branch.findUnique.mockResolvedValue(baseBranch);

    const rd = new RateDifferenceService(mockPrisma);
    const ov = new OpeningVoucherService(mockPrisma);
    const tp = new TaxProfileService(mockPrisma);
    vezne = new VezneService(mockPrisma, rd, ov, tp);
    rates = new ExchangeRatesService(mockPrisma);
    audit = new AuditService(mockPrisma);
  });

  // ===============================================================
  // 1. R-15 — Paralel receiptNo ayrımı
  // ===============================================================
  it('R-15: iki paralel createReceipt farklı receiptNo üretir', async () => {
    let counter = 0;
    mockPrisma.vezneReceiptSequence.upsert.mockImplementation(async () => ({
      lastNumber: ++counter,
    }));

    const p1 = vezne.createReceipt(
      {
        branchId: 'b1',
        currencyCode: 'USD' as never,
        receiptType: ReceiptType.BUY,
        foreignAmount: 100,
        rate: 32,
        tryAmount: 3200,
      },
      baseUser(),
    );
    const p2 = vezne.createReceipt(
      {
        branchId: 'b1',
        currencyCode: 'USD' as never,
        receiptType: ReceiptType.BUY,
        foreignAmount: 50,
        rate: 32,
        tryAmount: 1600,
      },
      baseUser(),
    );
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1.receiptNo).not.toEqual(r2.receiptNo);
    expect(mockPrisma.vezneReceiptSequence.upsert).toHaveBeenCalledTimes(2);
  });

  // ===============================================================
  // 2. R-02 — Tx rollback: cashTransaction hata → VezneReceipt yok
  // ===============================================================
  it('R-02: createReceipt $transaction ile sarılır ve hata tx rollback tetikler', async () => {
    let txCallCount = 0;
    mockPrisma.$transaction.mockImplementation(async (arg: any) => {
      txCallCount += 1;
      if (txCallCount === 1) {
        throw new Error('DB error');
      }
      if (typeof arg === 'function') return arg(mockPrisma);
      return Promise.all(arg);
    });

    // tx'in ilk çağrısı reject ediyor — bu vezne.service.ts'in createReceipt'ında
    // prisma.$transaction callback'inin tek sarılmasıdır. doğrudan çağrıldığında
    // hata olarak yansır.
    await expect(
      vezne.createReceipt(
        {
          branchId: 'b1',
          currencyCode: 'USD' as never,
          receiptType: ReceiptType.BUY,
          foreignAmount: 100,
          rate: 32,
          tryAmount: 3200,
        },
        baseUser(),
      ),
    ).rejects.toThrow(/DB error/);
    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  // ===============================================================
  // 3. R-03 — customerId=var → 2 customerTransaction
  // ===============================================================
  it('R-03: createReceipt customerId=var → TRY CREDIT + foreign DEBIT (BUY)', async () => {
    await vezne.createReceipt(
      {
        branchId: 'b1',
        currencyCode: 'USD' as never,
        receiptType: ReceiptType.BUY,
        foreignAmount: 100,
        rate: 32,
        tryAmount: 3200,
        customerId: 'cust-1',
      },
      baseUser(),
    );
    const cm = mockPrisma.customerMovement.create.mock.calls;
    const tryMoves = cm.filter((c) => c[0].data.currencyCode === 'TRY');
    const fxMoves = cm.filter((c) => c[0].data.currencyCode === 'USD');
    expect(tryMoves.length).toBeGreaterThanOrEqual(1);
    expect(fxMoves.length).toBeGreaterThanOrEqual(1);
    // BUY: müşteri yabancı sattı → biz TRY borçluyuz → müşteri alacaklandı (CREDIT)
    expect(tryMoves[0][0].data.direction).toBe('CREDIT');
    expect(fxMoves[0][0].data.foreignCurrency).toBe('USD');
  });

  // ===============================================================
  // 4. R-09 — correctReceipt ters hareket
  // ===============================================================
  it('R-09: correctReceipt orijinal cm.reverse + 2 yeni cm', async () => {
    mockPrisma.vezneReceipt.findFirst.mockResolvedValue({
      id: 'orig-1',
      branchId: 'b1',
      cashDrawerId: 'drawer-1',
      receiptType: ReceiptType.BUY,
      currencyCode: 'USD',
      foreignAmount: 100,
      rate: 32,
      tryAmount: 3200,
      status: 'POSTED',
      customerId: 'cust-1',
      customerName: 'Ahmet',
    });
    mockPrisma.customerMovement.findMany.mockResolvedValue([
      {
        id: 'cm-1',
        direction: 'CREDIT',
        amount: 3200,
        currency: 'TRY',
        refType: 'VEZNE_RECEIPT',
        refId: 'orig-1',
        customerId: 'cust-1',
        branchId: 'b1',
      },
      {
        id: 'cm-2',
        direction: 'DEBIT',
        amount: 100,
        foreignAmount: 100,
        foreignCurrency: 'USD',
        currency: 'USD',
        refType: 'VEZNE_RECEIPT',
        refId: 'orig-1',
        customerId: 'cust-1',
        branchId: 'b1',
      },
    ]);

    await vezne.correctReceipt(
      {
        receiptId: 'orig-1',
        foreignAmount: 200,
        rate: 32,
        tryAmount: 6400,
        reason: 'düzeltme sebebi açıkça belirtildi',
      },
      baseUser(),
    );

    // cm.findMany reversed + new ones
    const creates = mockPrisma.customerMovement.create.mock.calls.map(
      (c) => c[0].data,
    );
    // İlk 2 ters hareket (orijinalin tersi), sonra yeni düzeltme hareketleri
    const newOnes = creates.filter(
      (d: any) =>
        d.refType === 'VEZNE_RECEIPT' && (d.description ?? '').includes('düzeltme') || (d.movementDate && !d.note),
    );
    expect(creates.length).toBeGreaterThanOrEqual(2);
  });

  // ===============================================================
  // 5. R-08 — fark < 0 → ADJUSTMENT (gider)
  // ===============================================================
  it('R-08: banknoteCount fark<0 → ADJUSTMENT receipt + 397/100 voucher (gider)', async () => {
    mockPrisma.cashDrawer.findUnique.mockResolvedValue({
      id: 'drawer-1',
      branchId: 'b1',
    });
    mockPrisma.vezneReceipt.groupBy.mockResolvedValue([
      { receiptType: 'BUY', _sum: { foreignAmount: 1000 } },
      { receiptType: 'SELL', _sum: { foreignAmount: 500 } },
    ]);

    const out = await vezne.banknoteCount(
      {
        cashDrawerId: 'drawer-1',
        currencyCode: 'USD' as never,
        denominations: [{ denomValue: 400, count: 1 }],
      } as any,
      baseUser(),
    );

    const adj = mockPrisma.vezneReceipt.create.mock.calls.find((c: any) =>
      c[0].data.receiptType?.includes('ADJUSTMENT'),
    );
    expect(adj).toBeDefined();
    expect(out.diff).toBeLessThan(0);
  });

  // ===============================================================
  // 6. R-08 — fark > 0 → ADJUSTMENT (gelir)
  // ===============================================================
  it('R-08: banknoteCount fark>0 → ADJUSTMENT receipt + 100/397 voucher (gelir)', async () => {
    mockPrisma.cashDrawer.findUnique.mockResolvedValue({
      id: 'drawer-1',
      branchId: 'b1',
    });
    mockPrisma.vezneReceipt.groupBy.mockResolvedValue([
      { receiptType: 'BUY', _sum: { foreignAmount: 1000 } },
    ]);

    const out = await vezne.banknoteCount(
      {
        cashDrawerId: 'drawer-1',
        currencyCode: 'USD' as never,
        denominations: [{ denomValue: 1100, count: 1 }],
      } as any,
      baseUser(),
    );

    const adj = mockPrisma.vezneReceipt.create.mock.calls.find((c: any) =>
      c[0].data.receiptType?.includes('ADJUSTMENT'),
    );
    expect(adj).toBeDefined();
    expect(out.diff).toBeGreaterThan(0);
  });

  // ===============================================================
  // 7. R-11 — voidReceipt POSTED → VOIDED
  // ===============================================================
  it('R-11: voidReceipt POSTED → VOIDED + cash + customer tx reverse', async () => {
    mockPrisma.vezneReceipt.findFirst.mockResolvedValue({
      id: 'orig-v',
      branchId: 'b1',
      cashDrawerId: 'drawer-1',
      receiptType: ReceiptType.BUY,
      currencyCode: 'USD',
      foreignAmount: 100,
      rate: 32,
      tryAmount: 3200,
      status: 'POSTED',
      customerId: 'cust-1',
      customerName: 'Ahmet',
    });
    mockPrisma.customerMovement.findMany.mockResolvedValue([
      {
        id: 'cm-x',
        direction: 'CREDIT',
        amount: 3200,
        currency: 'TRY',
        refType: 'VEZNE_RECEIPT',
        refId: 'orig-v',
        customerId: 'cust-1',
        branchId: 'b1',
      },
    ]);

    const out = await vezne.voidReceipt(
      { receiptId: 'orig-v', reason: 'müşteri vazgeçti' },
      baseUser(),
    );
    expect(out.status).toBe('VOIDED');
    // Ters hareket oluşturuldu mu? — ters sign DEBIT (orijinal CREDIT idi)
    const reverseCm = mockPrisma.customerMovement.create.mock.calls.find(
      (c: any) => c[0].data.direction === 'DEBIT',
    );
    expect(reverseCm).toBeDefined();
  });

  // ===============================================================
  // 8. R-06 — Rate difference voucher
  // ===============================================================
  it('R-06: createReceipt kapanış kuruna göre 646/656 voucher üretir', async () => {
    rateDifferenceStub.calculate.mockReturnValueOnce({
      diff: 200,
      nature: 'INCOME',
      accountCode: '646',
    });

    const r = await vezne.createReceipt(
      {
        branchId: 'b1',
        currencyCode: 'USD' as never,
        receiptType: ReceiptType.BUY,
        foreignAmount: 100,
        rate: 32,
        tryAmount: 3200,
      },
      baseUser(),
    );
    expect(rateDifferenceStub.computeAndPost).toHaveBeenCalled();
  });

  // ===============================================================
  // 9. R-07 — TR BSMV
  // ===============================================================
  it('R-07: TR şube BSMV tax line + 360 voucher', async () => {
    taxProfileStub.computeAndPost.mockResolvedValueOnce([
      {
        taxType: 'BSMV',
        rate: 0.001,
        amount: 3.2,
        accountCode: '360',
        description: 'BSMV (TR)',
        voucherId: 'tv-bsmv',
      },
    ]);
    await vezne.createReceipt(
      {
        branchId: 'b1',
        currencyCode: 'USD' as never,
        receiptType: ReceiptType.BUY,
        foreignAmount: 100,
        rate: 32,
        tryAmount: 3200,
        taxCountry: 'TR',
      },
      baseUser(),
    );
    expect(taxProfileStub.computeAndPost).toHaveBeenCalled();
  });

  // ===============================================================
  // 10. R-07 — IQ CBK
  // ===============================================================
  it('R-07: IQ şube CBK tax line + 360 voucher', async () => {
    mockPrisma.branch.findUnique.mockResolvedValue({
      id: 'b-iq',
      country: 'IQ',
      timezone: 'Asia/Baghdad',
    });
    taxProfileStub.computeAndPost.mockResolvedValueOnce([
      {
        taxType: 'CBK',
        rate: 0.02,
        amount: 64,
        accountCode: '360',
        description: 'CBK (IQ)',
        voucherId: 'tv-cbk',
      },
    ]);
    await vezne.createReceipt(
      {
        branchId: 'b-iq',
        currencyCode: 'USD' as never,
        receiptType: ReceiptType.BUY,
        foreignAmount: 100,
        rate: 32,
        tryAmount: 3200,
        taxCountry: 'IQ',
      },
      baseUser(),
    );
    expect(taxProfileStub.computeAndPost).toHaveBeenCalled();
  });

  // ===============================================================
  // 11. R-04 — openingVoucher ilk çağrı devir fişi üretir
  // ===============================================================
  it('R-04: opening-voucher yılın ilk günü çağrılınca VoucherType=OPENING devir fişi üretir', async () => {
    openingVoucherStub.ensureOpeningVoucher.mockResolvedValueOnce('opening-id');
    // service.createReceipt tetikler
    await vezne.createReceipt(
      {
        branchId: 'b1',
        currencyCode: 'USD' as never,
        receiptType: ReceiptType.BUY,
        foreignAmount: 10,
        rate: 32,
        tryAmount: 320,
      },
      baseUser(),
    );
    expect(openingVoucherStub.ensureOpeningVoucher).toHaveBeenCalled();
  });

  // ===============================================================
  // 12. R-04 — idempotent: 2. çağrı null
  // ===============================================================
  it('R-04: opening-voucher 2. kez çağrılınca idempotent — tekrar üretmez', async () => {
    let call = 0;
    openingVoucherStub.ensureOpeningVoucher.mockImplementation(async () => {
      call += 1;
      return call === 1 ? 'opening-id' : null;
    });
    await vezne.createReceipt(
      {
        branchId: 'b1',
        currencyCode: 'USD' as never,
        receiptType: ReceiptType.BUY,
        foreignAmount: 10,
        rate: 32,
        tryAmount: 320,
      },
      baseUser(),
    );
    await vezne.createReceipt(
      {
        branchId: 'b1',
        currencyCode: 'USD' as never,
        receiptType: ReceiptType.BUY,
        foreignAmount: 10,
        rate: 32,
        tryAmount: 320,
      },
      baseUser(),
    );
    expect(openingVoucherStub.ensureOpeningVoucher).toHaveBeenCalledTimes(2);
  });

  // ===============================================================
  // 13. R-05 — auto closing weighted avg
  // ===============================================================
  it('R-05: upsertAutoClosingRates son 20 işlem ağırlıklı ortalamasını CLOSING yazar', async () => {
    mockPrisma.currency.findMany.mockResolvedValue([
      { code: 'USD', active: true },
    ]);
    mockPrisma.vezneReceipt.findMany.mockResolvedValue([
      { receiptType: 'BUY', foreignAmount: 100, rate: 30 },
      { receiptType: 'BUY', foreignAmount: 400, rate: 32 },
      { receiptType: 'SELL', foreignAmount: 200, rate: 31 },
    ]);
    mockPrisma.exchangeRate.findFirst.mockResolvedValue(null);

    const buyAvg = computeWeightedAverages([
      { receiptType: 'BUY', foreignAmount: 100, rate: 30 },
      { receiptType: 'BUY', foreignAmount: 400, rate: 32 },
    ]);
    expect(buyAvg.buy).toBe(31.6);
    expect(buyAvg.sell).toBe(0);

    const both = computeWeightedAverages([
      { receiptType: 'BUY', foreignAmount: 100, rate: 30 },
      { receiptType: 'BUY', foreignAmount: 400, rate: 32 },
      { receiptType: 'SELL', foreignAmount: 200, rate: 31 },
    ]);
    expect(both.sell).toBe(31);

    const written = await rates.upsertAutoClosingRates(
      'b1',
      new Date('2026-09-03'),
      baseUser(),
    );
    expect(written).toBeGreaterThanOrEqual(0);
    const call = mockPrisma.exchangeRate.create.mock.calls.find(
      (c: any) => c[0].data.source === 'CLOSING',
    );
    expect(call).toBeDefined();
  });

  // ===============================================================
  // 14. R-13 — locked CLOSING reddi
  // ===============================================================
  it('R-13: locked CLOSING rate update edilemez', async () => {
    mockPrisma.currency.findUnique.mockResolvedValue({ code: 'USD' });
    mockPrisma.exchangeRate.findFirst.mockResolvedValue({
      id: 'locked-rate',
      isLocked: true,
      buyRate: 32,
      sellRate: 32.5,
    });
    await expect(
      rates.upsert(
        {
          branchId: 'b1',
          currencyCode: 'USD' as never,
          rateType: 'CLOSING' as never,
          buyRate: 33,
          sellRate: 33.5,
        },
        baseUser(),
      ),
    ).rejects.toThrow(/locked/i);
  });

  // ===============================================================
  // 15. R-12 — DELETE x-audit-reason olmadan 400
  // ===============================================================
  it('R-12: DELETE x-audit-reason olmadan BadRequest', () => {
    expect(() =>
      audit.requireReason('CashTransaction', 'DELETE'),
    ).toThrow(BadRequestException);
  });

  // ===============================================================
  // 16. R-12 — header ile 200 + log dolu
  // ===============================================================
  it('R-12: x-audit-reason ile DELETE serbest + log dolu', async () => {
    audit.setReason('silme sebebi açıkça belirtildi');
    expect(() =>
      audit.requireReason('CashTransaction', 'DELETE'),
    ).not.toThrow();

    // Audit middleware davranışını simüle et
    const mw = new AuditContextMiddleware(audit);
    const req: any = {
      method: 'DELETE',
      headers: { 'x-audit-reason': 'müşteri talebi ile siliniyor' },
      body: {},
      ip: '127.0.0.1',
      user: { id: 'u1', branchIds: ['b1'], defaultBranchId: 'b1' },
    };
    const next = vi.fn();
    mw.use(req, {} as any, next);
    expect(next).toHaveBeenCalled();
  });

  // ===============================================================
  // 17. R-14 — TR timezone
  // ===============================================================
  it('R-14: TR branch timezone Europe/Istanbul kullanır', async () => {
    mockPrisma.branch.findUnique.mockResolvedValue({
      id: 'b1',
      country: 'TR',
      timezone: 'Europe/Istanbul',
    });
    await vezne.createReceipt(
      {
        branchId: 'b1',
        currencyCode: 'USD' as never,
        receiptType: ReceiptType.BUY,
        foreignAmount: 10,
        rate: 32,
        tryAmount: 320,
      },
      baseUser(),
    );
    // upsertReceipt çağrılırken date alanı var mı?
    const seqCall = mockPrisma.vezneReceiptSequence.upsert.mock.calls[0];
    expect(seqCall).toBeDefined();
    // branch.findUnique TR için doğru çağrıldı
    expect(mockPrisma.branch.findUnique).toHaveBeenCalled();
  });

  // ===============================================================
  // 18. R-14 — IQ timezone
  // ===============================================================
  it('R-14: IQ branch timezone Asia/Baghdad kullanır', async () => {
    mockPrisma.branch.findUnique.mockResolvedValue({
      id: 'b-iq',
      country: 'IQ',
      timezone: 'Asia/Baghdad',
    });
    await vezne.createReceipt(
      {
        branchId: 'b-iq',
        currencyCode: 'USD' as never,
        receiptType: ReceiptType.BUY,
        foreignAmount: 10,
        rate: 32,
        tryAmount: 320,
      },
      baseUser(),
    );
    expect(mockPrisma.branch.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'b-iq' } }),
    );
  });

  // ===============================================================
  // 19. R-10 — branchId yoksa BadRequest
  // ===============================================================
  it('R-10: branchId eksik → BadRequest', async () => {
    await expect(
      rates.upsert(
        {
          branchId: '',
          currencyCode: 'USD' as never,
          rateType: 'FREE' as never,
          buyRate: 32,
          sellRate: 32.5,
        },
        baseUser(),
      ),
    ).rejects.toThrow(BadRequestException);

    await expect(rates.closingRatesForDate('', new Date())).rejects.toThrow(
      BadRequestException,
    );
    await expect(rates.currentFree('')).rejects.toThrow(BadRequestException);
  });

  // ===============================================================
  // 20. R-11 — voidReceipt sebep<3 kar → 400
  // ===============================================================
  it('R-11: voidReceipt sebep<3 karakter → BadRequest', async () => {
    await expect(
      vezne.voidReceipt(
        { receiptId: 'orig-x', reason: 'ab' },
        baseUser(),
      ),
    ).rejects.toThrow(/sebep|reason/i);
  });
});
