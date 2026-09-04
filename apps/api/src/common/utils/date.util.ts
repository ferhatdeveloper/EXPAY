import { Country } from '@prisma/client';

/**
 * DateUtil — R-14
 *
 * Şubelerin ülkesine göre timezone-aware tarih yardımcıları.
 * TR -> Europe/Istanbul (UTC+3, yaz saati yok)
 * IQ -> Asia/Baghdad  (UTC+3, yaz saati yok)
 *
 * Postgres `TIMESTAMPTZ` her şeyi UTC'de tutar. İş mantığı "şubenin
 * yerel günü" kavramını kullandığından bu yardımcılar zorunlu.
 *
 * Not: JavaScript Date'te timezone dönüşümü için Intl.DateTimeFormat
 * trick veya üçüncü parti kütüphane (date-fns-tz, luxon) kullanılabilir.
 * Burada Intl tabanlı hafif bir implementasyon tercih ettik.
 */

const TIMEZONE_BY_COUNTRY: Record<Country, string> = {
  TR: 'Europe/Istanbul',
  IQ: 'Asia/Baghdad',
};

const LOCALE_BY_COUNTRY: Record<Country, string> = {
  TR: 'tr-TR',
  IQ: 'ar-IQ',
};

const DATE_FORMAT_BY_COUNTRY: Record<Country, string> = {
  TR: 'dd.MM.yyyy HH:mm',
  IQ: 'yyyy-MM-dd HH:mm',
};

export function getTimezone(country: Country | string | undefined | null): string {
  if (country === 'IQ' || country === 'Asia/Baghdad') return 'Asia/Baghdad';
  return TIMEZONE_BY_COUNTRY.TR; // default TR
}

export function getLocale(country: Country | string | undefined | null): string {
  if (country === 'IQ') return LOCALE_BY_COUNTRY.IQ;
  return LOCALE_BY_COUNTRY.TR;
}

/**
 * Şubenin saatini döndürür. JS Date her zaman UTC instants olsa da,
 * `getHours()` yerel timezone'a göre çalışır. Burada branch'in TZ'de
 * şu an "kaç saat" hesabı yapılır.
 */
export function nowInBranch(
  branch: { country?: Country | string | null; timezone?: string | null } | null | undefined,
): Date {
  // Date nesnesinin taşıdığı UNIX timestamp'in timezone kavramı yoktur;
  // İş mantığında kullanırken business day hesabı için startOfDayInBranch
  // kullanılmalıdır. Bu yardımcı sadece simetri/signature için var.
  return new Date();
}

/**
 * Branch timezone'unda, `date` (default = şimdi) için günün başlangıcı.
 * PostgreSQL tarafında UTC instants olarak saklanır, dönüş değeri de
 * Date olarak döner.
 */
export function startOfDayInBranch(
  branch: { country?: Country | string | null; timezone?: string | null } | null | undefined,
  date: Date = new Date(),
): Date {
  const tz = branch?.timezone || getTimezone(branch?.country);
  // YYYY-MM-DD olarak branch-local formatla, sonra UTC midnight olarak döndür
  const ymd = formatYmdInTimezone(date, tz);
  // "2025-09-03T00:00:00" -> önce UTC, sonra bu tarihin TZ karşılığı 00:00:00
  const tzMidnight = parseLocalDateAtMidnight(ymd, tz);
  return tzMidnight;
}

export function endOfDayInBranch(
  branch: { country?: Country | string | null; timezone?: string | null } | null | undefined,
  date: Date = new Date(),
): Date {
  const start = startOfDayInBranch(branch, date);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
}

/**
 * Branch locale'ine göre "dd.MM.yyyy HH:mm" formatında string.
 */
export function formatDateForBranch(
  branch: { country?: Country | string | null; timezone?: string | null } | null | undefined,
  date: Date,
): string {
  const country = branch?.country as Country | undefined;
  const locale = getLocale(country);
  try {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: branch?.timezone || getTimezone(country),
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

/**
 * Branch'te bu yılın ilk günü mü? (1 Ocak yerel)
 */
export function isFirstDayOfYearInBranch(
  branch: { country?: Country | string | null; timezone?: string | null } | null | undefined,
  date: Date,
): boolean {
  const tz = branch?.timezone || getTimezone(branch?.country);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  return month === '01' && day === '01';
}

/**
 * Branch'te bugün mü? (date paramı default = now)
 */
export function isTodayInBranch(
  branch: { country?: Country | string | null; timezone?: string | null } | null | undefined,
  date: Date = new Date(),
): boolean {
  const tz = branch?.timezone || getTimezone(branch?.country);
  const todayYmd = formatYmdInTimezone(new Date(), tz);
  const targetYmd = formatYmdInTimezone(date, tz);
  return todayYmd === targetYmd;
}

// ----------- internal helpers -----------

function formatYmdInTimezone(d: Date, tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(d);
    const y = parts.find((p) => p.type === 'year')?.value ?? '1970';
    const m = parts.find((p) => p.type === 'month')?.value ?? '01';
    const day = parts.find((p) => p.type === 'day')?.value ?? '01';
    return `${y}-${m}-${day}`;
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

/**
 * "YYYY-MM-DD" + timezone için local midnight -> UTC Date.
 * Türkiye/Bağdat'ta TZ ile UTC aynı olduğundan şu an basit yaklaşım yeterli.
 * Gelecekte TZ offset farklı olursa: (local as UTC midnight) - offset'i hesapla.
 */
function parseLocalDateAtMidnight(ymd: string, tz: string): Date {
  // Önce date'i UTC midnight olarak parse et
  const utcGuess = new Date(`${ymd}T00:00:00.000Z`);
  // Bu UTC anının TZ'deki saatini hesapla
  const localAtMidnight = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour12: false,
  }).formatToParts(utcGuess);
  const tzHour = Number(
    localAtMidnight.find((p) => p.type === 'hour')?.value ?? '0',
  );
  const tzMinute = Number(
    localAtMidnight.find((p) => p.type === 'minute')?.value ?? '0',
  );
  const offsetMs = (tzHour * 60 + tzMinute) * 60 * 1000;
  // Eğer TZ ofset 3 saat ise (TR/IQ), UTC midnight -> local 03:00
  // local midnight istiyoruz, o zaman UTC = local_midnight - offset
  return new Date(utcGuess.getTime() - offsetMs);
}
