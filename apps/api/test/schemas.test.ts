import { describe, it, expect } from 'vitest';
import {
  BulkTransferToMainSchema,
  CreateAccountingVoucherSchema,
  CreateVezneReceiptSchema,
  LoginSchema,
} from '@doviz/shared';

describe('Zod schemas', () => {
  it('validates login input', () => {
    expect(() => LoginSchema.parse({ username: 'admin', password: 'admin123' })).not.toThrow();
    expect(() => LoginSchema.parse({ username: 'a', password: '1' })).toThrow();
  });

  it('validates vezne receipt', () => {
    const ok = {
      branchId: '550e8400-e29b-41d4-a716-446655440000',
      cashDrawerId: '550e8400-e29b-41d4-a716-446655440001',
      currencyCode: 'USD',
      receiptType: 'BUY' as const,
      foreignAmount: 100,
      rate: 32,
      tryAmount: 3200,
    };
    expect(() => CreateVezneReceiptSchema.parse(ok)).not.toThrow();

    expect(() =>
      CreateVezneReceiptSchema.parse({ ...ok, foreignAmount: -1 }),
    ).toThrow();
  });

  it('validates bulk transfer requires at least one item', () => {
    expect(() =>
      BulkTransferToMainSchema.parse({
        branchId: '550e8400-e29b-41d4-a716-446655440000',
        fromCashDrawerId: '550e8400-e29b-41d4-a716-446655440001',
        toCashAccountId: '550e8400-e29b-41d4-a716-446655440002',
        items: [],
      }),
    ).toThrow();
  });

  it('validates accounting voucher lines structure', () => {
    expect(() =>
      CreateAccountingVoucherSchema.parse({
        branchId: '550e8400-e29b-41d4-a716-446655440000',
        voucherType: 'NORMAL',
        date: new Date(),
        description: 'Test',
        lines: [{ accountCode: '100', currencyCode: 'TRY', debit: 100, credit: 0 }],
      }),
    ).toThrow(); // min 2 lines
  });
});