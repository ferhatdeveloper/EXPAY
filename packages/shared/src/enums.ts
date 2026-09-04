export enum CurrencyCode {
  TRY = 'TRY',
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
  CHF = 'CHF',
  JPY = 'JPY',
  AUD = 'AUD',
  CAD = 'CAD',
  SAR = 'SAR',
  AED = 'AED',
  KWD = 'KWD',
  RUB = 'RUB',
  CNY = 'CNY',
  IRR = 'IRR',
  IQD = 'IQD',
  SEK = 'SEK',
  NOK = 'NOK',
  DKK = 'DKK',
  PLN = 'PLN',
  ZAR = 'ZAR',
  MXN = 'MXN',
  BRL = 'BRL',
  INR = 'INR',
  PKR = 'PKR',
  EGP = 'EGP',
  JOD = 'JOD',
  LBP = 'LBP',
  SYP = 'SYP',
  AZN = 'AZN',
  GEL = 'GEL',
  BAM = 'BAM',
  QAR = 'QAR',
  OMR = 'OMR',
  BHD = 'BHD',
}

export enum RateType {
  RAW_FREE = 'RAW_FREE',
  FREE = 'FREE',
  CLOSING = 'CLOSING',
}

export enum ReceiptType {
  BUY = 'BUY',
  SELL = 'SELL',
}

export enum TransferStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum VoucherType {
  OPENING = 'OPENING',
  CLOSING = 'CLOSING',
  NORMAL = 'NORMAL',
  CORRECTION = 'CORRECTION',
}

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  TRANSFER = 'TRANSFER',
}

export enum DayEndStatus {
  OPEN = 'OPEN',
  CLOSING = 'CLOSING',
  CLOSED = 'CLOSED',
}

export const SUPPORTED_LANGUAGES = ['tr', 'en', 'ar', 'ku', 'fa'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const RTL_LANGUAGES: Language[] = ['ar', 'ku', 'fa'];

export const DEFAULT_CURRENCIES: CurrencyCode[] = [
  CurrencyCode.USD,
  CurrencyCode.EUR,
  CurrencyCode.GBP,
  CurrencyCode.CHF,
  CurrencyCode.JPY,
  CurrencyCode.AUD,
  CurrencyCode.CAD,
  CurrencyCode.SAR,
  CurrencyCode.AED,
  CurrencyCode.KWD,
  CurrencyCode.RUB,
  CurrencyCode.CNY,
  CurrencyCode.IRR,
  CurrencyCode.IQD,
];