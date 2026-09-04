import { CURRENCY_META, CurrencyCode } from '@doviz/shared';

export type Locale = 'tr' | 'en' | 'ar' | 'ku' | 'fa';
export type BranchCountry = 'TR' | 'IQ';

export const LOCALE_MAP: Record<Locale, string> = {
  tr: 'tr-TR',
  en: 'en-US',
  ar: 'ar-EG',
  ku: 'ckb-IQ',
  fa: 'fa-IR',
};

/**
 * Şubeye göre timezone (R-14). TR -> Europe/Istanbul, IQ -> Asia/Baghdad.
 */
export const TIMEZONE_BY_COUNTRY: Record<BranchCountry, string> = {
  TR: 'Europe/Istanbul',
  IQ: 'Asia/Baghdad',
};

/**
 * Şubeye göre locale (R-14). TR -> tr-TR, IQ -> ar-IQ.
 */
export const LOCALE_BY_COUNTRY: Record<BranchCountry, string> = {
  TR: 'tr-TR',
  IQ: 'ar-IQ',
};

export function formatCurrency(value: number, currency: CurrencyCode, locale: Locale = 'tr'): string {
  const meta = CURRENCY_META[currency];
  try {
    return new Intl.NumberFormat(LOCALE_MAP[locale], {
      style: 'decimal',
      minimumFractionDigits: meta.decimalDigits,
      maximumFractionDigits: meta.decimalDigits,
    }).format(value) + ` ${meta.symbol}`;
  } catch {
    return `${value.toFixed(meta.decimalDigits)} ${meta.symbol}`;
  }
}

export function formatNumber(value: number, locale: Locale = 'tr', maxDigits = 8): string {
  try {
    return new Intl.NumberFormat(LOCALE_MAP[locale], { maximumFractionDigits: maxDigits }).format(value);
  } catch {
    return value.toString();
  }
}

export function formatDate(value: Date | string, locale: Locale = 'tr'): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  try {
    return new Intl.DateTimeFormat(LOCALE_MAP[locale], { dateStyle: 'short' }).format(d);
  } catch {
    return d.toLocaleDateString();
  }
}

export function formatDateTime(value: Date | string, locale: Locale = 'tr'): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  try {
    return new Intl.DateTimeFormat(LOCALE_MAP[locale], { dateStyle: 'short', timeStyle: 'short' }).format(d);
  } catch {
    return d.toLocaleString();
  }
}

export function formatPercent(value: number, locale: Locale = 'tr'): string {
  try {
    return new Intl.NumberFormat(LOCALE_MAP[locale], { style: 'percent', minimumFractionDigits: 2 }).format(value / 100);
  } catch {
    return `${value.toFixed(2)}%`;
  }
}

/**
 * R-14: Şube ülkesine göre tarih formatı.
 * TR: dd.MM.yyyy HH:mm
 * IQ: yyyy-MM-dd HH:mm
 */
export function formatDateForBranch(
  value: Date | string,
  country: BranchCountry = 'TR',
): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  const locale = LOCALE_BY_COUNTRY[country];
  const timeZone = TIMEZONE_BY_COUNTRY[country];
  try {
    return new Intl.DateTimeFormat(locale, {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return d.toLocaleString();
  }
}

/**
 * Şubenin timezone adını döner.
 */
export function getTimezoneForCountry(country: BranchCountry | string | undefined | null): string {
  if (country === 'IQ') return TIMEZONE_BY_COUNTRY.IQ;
  return TIMEZONE_BY_COUNTRY.TR;
}
