import { describe, it, expect } from 'vitest';
import {
  calculateForeignAmount,
  calculateProfitability,
  calculateTryAmount,
  CURRENCY_META,
  CurrencyCode,
  roundCurrency,
  roundTry,
} from '@doviz/shared';

describe('Currency utilities', () => {
  it('rounds TRY correctly', () => {
    expect(roundTry(12.345)).toBe(12.35);
    expect(roundTry(12.344)).toBe(12.34);
  });

  it('rounds JPY (0 decimals) correctly', () => {
    expect(roundCurrency(1234.7, CurrencyCode.JPY)).toBe(1235);
    expect(roundCurrency(1234.4, CurrencyCode.JPY)).toBe(1234);
  });

  it('rounds KWD (3 decimals) correctly', () => {
    expect(roundCurrency(0.12345, CurrencyCode.KWD)).toBe(0.123);
  });

  it('calculates TRY amount from foreign + rate', () => {
    expect(calculateTryAmount(100, 32.5, 'BUY')).toBe(3250);
    expect(calculateTryAmount(100, 32.5, 'SELL')).toBe(3250);
  });

  it('calculates foreign amount from TRY + rate', () => {
    expect(calculateForeignAmount(3250, 32.5)).toBe(100);
  });

  it('currency meta contains all known codes', () => {
    Object.values(CurrencyCode).forEach((c) => {
      expect(CURRENCY_META[c]).toBeDefined();
      expect(CURRENCY_META[c].decimalDigits).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('Profitability calculations', () => {
  it('BUY profit is positive when closing sell > buy rate', () => {
    const profit = calculateProfitability({
      receiptType: 'BUY',
      foreignAmount: 1000,
      buyRate: 32,
      sellRate: 32.5,
      closingSellRate: 32.6,
    });
    expect(profit).toBeCloseTo(600); // (32.6 - 32) * 1000
  });

  it('SELL profit is positive when sell > closing buy rate', () => {
    const profit = calculateProfitability({
      receiptType: 'SELL',
      foreignAmount: 500,
      buyRate: 32,
      sellRate: 32.5,
      closingBuyRate: 31.9,
    });
    expect(profit).toBeCloseTo(300); // (32.5 - 31.9) * 500
  });

  it('falls back to current rate when no closing rate provided', () => {
    const profit = calculateProfitability({
      receiptType: 'SELL',
      foreignAmount: 100,
      buyRate: 32,
      sellRate: 32.5,
    });
    expect(profit).toBeCloseTo(50);
  });
});