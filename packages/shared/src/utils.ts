import { CurrencyCode } from './enums';

export interface CurrencyMeta {
  code: CurrencyCode;
  name: string;
  symbol: string;
  decimalDigits: number;
}

export const CURRENCY_META: Record<CurrencyCode, CurrencyMeta> = {
  [CurrencyCode.TRY]: { code: CurrencyCode.TRY, name: 'Turk Lirasi', symbol: 'TL', decimalDigits: 2 },
  [CurrencyCode.USD]: { code: CurrencyCode.USD, name: 'US Dollar', symbol: '$', decimalDigits: 2 },
  [CurrencyCode.EUR]: { code: CurrencyCode.EUR, name: 'Euro', symbol: 'EUR', decimalDigits: 2 },
  [CurrencyCode.GBP]: { code: CurrencyCode.GBP, name: 'British Pound', symbol: 'GBP', decimalDigits: 2 },
  [CurrencyCode.CHF]: { code: CurrencyCode.CHF, name: 'Swiss Franc', symbol: 'CHF', decimalDigits: 2 },
  [CurrencyCode.JPY]: { code: CurrencyCode.JPY, name: 'Japanese Yen', symbol: 'JPY', decimalDigits: 0 },
  [CurrencyCode.AUD]: { code: CurrencyCode.AUD, name: 'Australian Dollar', symbol: 'AUD', decimalDigits: 2 },
  [CurrencyCode.CAD]: { code: CurrencyCode.CAD, name: 'Canadian Dollar', symbol: 'CAD', decimalDigits: 2 },
  [CurrencyCode.SAR]: { code: CurrencyCode.SAR, name: 'Saudi Riyal', symbol: 'SAR', decimalDigits: 2 },
  [CurrencyCode.AED]: { code: CurrencyCode.AED, name: 'UAE Dirham', symbol: 'AED', decimalDigits: 2 },
  [CurrencyCode.KWD]: { code: CurrencyCode.KWD, name: 'Kuwaiti Dinar', symbol: 'KWD', decimalDigits: 3 },
  [CurrencyCode.RUB]: { code: CurrencyCode.RUB, name: 'Russian Ruble', symbol: 'RUB', decimalDigits: 2 },
  [CurrencyCode.CNY]: { code: CurrencyCode.CNY, name: 'Chinese Yuan', symbol: 'CNY', decimalDigits: 2 },
  [CurrencyCode.IRR]: { code: CurrencyCode.IRR, name: 'Iranian Rial', symbol: 'IRR', decimalDigits: 0 },
  [CurrencyCode.IQD]: { code: CurrencyCode.IQD, name: 'Iraqi Dinar', symbol: 'IQD', decimalDigits: 0 },
  [CurrencyCode.SEK]: { code: CurrencyCode.SEK, name: 'Swedish Krona', symbol: 'SEK', decimalDigits: 2 },
  [CurrencyCode.NOK]: { code: CurrencyCode.NOK, name: 'Norwegian Krone', symbol: 'NOK', decimalDigits: 2 },
  [CurrencyCode.DKK]: { code: CurrencyCode.DKK, name: 'Danish Krone', symbol: 'DKK', decimalDigits: 2 },
  [CurrencyCode.PLN]: { code: CurrencyCode.PLN, name: 'Polish Zloty', symbol: 'PLN', decimalDigits: 2 },
  [CurrencyCode.ZAR]: { code: CurrencyCode.ZAR, name: 'South African Rand', symbol: 'ZAR', decimalDigits: 2 },
  [CurrencyCode.MXN]: { code: CurrencyCode.MXN, name: 'Mexican Peso', symbol: 'MXN', decimalDigits: 2 },
  [CurrencyCode.BRL]: { code: CurrencyCode.BRL, name: 'Brazilian Real', symbol: 'BRL', decimalDigits: 2 },
  [CurrencyCode.INR]: { code: CurrencyCode.INR, name: 'Indian Rupee', symbol: 'INR', decimalDigits: 2 },
  [CurrencyCode.PKR]: { code: CurrencyCode.PKR, name: 'Pakistani Rupee', symbol: 'PKR', decimalDigits: 2 },
  [CurrencyCode.EGP]: { code: CurrencyCode.EGP, name: 'Egyptian Pound', symbol: 'EGP', decimalDigits: 2 },
  [CurrencyCode.JOD]: { code: CurrencyCode.JOD, name: 'Jordanian Dinar', symbol: 'JOD', decimalDigits: 3 },
  [CurrencyCode.LBP]: { code: CurrencyCode.LBP, name: 'Lebanese Pound', symbol: 'LBP', decimalDigits: 0 },
  [CurrencyCode.SYP]: { code: CurrencyCode.SYP, name: 'Syrian Pound', symbol: 'SYP', decimalDigits: 0 },
  [CurrencyCode.AZN]: { code: CurrencyCode.AZN, name: 'Azerbaijani Manat', symbol: 'AZN', decimalDigits: 2 },
  [CurrencyCode.GEL]: { code: CurrencyCode.GEL, name: 'Georgian Lari', symbol: 'GEL', decimalDigits: 2 },
  [CurrencyCode.BAM]: { code: CurrencyCode.BAM, name: 'Bosnia-Herzegovina Mark', symbol: 'BAM', decimalDigits: 2 },
  [CurrencyCode.QAR]: { code: CurrencyCode.QAR, name: 'Qatari Riyal', symbol: 'QAR', decimalDigits: 2 },
  [CurrencyCode.OMR]: { code: CurrencyCode.OMR, name: 'Omani Rial', symbol: 'OMR', decimalDigits: 3 },
  [CurrencyCode.BHD]: { code: CurrencyCode.BHD, name: 'Bahraini Dinar', symbol: 'BHD', decimalDigits: 3 },
};

/**
 * Calculate TRY amount from foreign amount and rate.
 */
export function calculateTryAmount(foreignAmount: number, rate: number, receiptType: 'BUY' | 'SELL'): number {
  if (receiptType === 'SELL') {
    return roundCurrency(foreignAmount * rate, CurrencyCode.TRY);
  }
  return roundCurrency(foreignAmount * rate, CurrencyCode.TRY);
}

/**
 * Calculate foreign amount from TRY amount and rate.
 */
export function calculateForeignAmount(tryAmount: number, rate: number): number {
  return roundCurrency(tryAmount / rate, CurrencyCode.USD);
}

export function roundCurrency(value: number, code: CurrencyCode): number {
  const meta = CURRENCY_META[code];
  const factor = Math.pow(10, meta.decimalDigits);
  return Math.round(value * factor) / factor;
}

export function roundTry(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateProfitability(args: {
  receiptType: 'BUY' | 'SELL';
  foreignAmount: number;
  buyRate: number;
  sellRate: number;
  closingBuyRate?: number;
  closingSellRate?: number;
}): number {
  const { receiptType, foreignAmount, buyRate, sellRate, closingBuyRate, closingSellRate } = args;
  if (receiptType === 'BUY') {
    // Buro aliyor: yarin kapatus kuru ile satarsa kar eder
    const ref = closingSellRate ?? sellRate;
    return (ref - buyRate) * foreignAmount;
  }
  // Buro satiyor: alis kuruna gore kar
  const ref = closingBuyRate ?? buyRate;
  return (sellRate - ref) * foreignAmount;
}