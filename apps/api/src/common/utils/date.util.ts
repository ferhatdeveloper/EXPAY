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
 * R-14 fix: Bir timezone'un belirli bir tarih için UTC'den kaç dakika
 * saptığını hesaplar. (örn. Europe/Istanbul için yaz/kış fark etmeksizin 180).
 *
 * Implementasyon: aynı UTC instant'i iki ayrı timezone'da formatlarız;
 * aradaki saat farkı ofseti verir. `Intl.DateTimeFormat` DST ve tüm
 * tarihsel anomalileri doğru hesaplar.
 */
function getTzOffsetMinutes(date: Date, tz: string): number {
  const utcParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const tzParts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const asNum = (parts: Intl.DateTimeFormatPart[], type: string): number =>
    Number(parts.find((p) => p.type === type)?.value ?? '0');
  // UTC için hour "24" gelebilir (Safari), 0..23 aralığına indir
  const norm = (h: number): number => (h === 24 ? 0 : h);
  const utcMs = Date.UTC(
    asNum(utcParts, 'year'),
    asNum(utcParts, 'month') - 1,
    asNum(utcParts, 'day'),
    norm(asNum(utcParts, 'hour')),
    asNum(utcParts, 'minute'),
    asNum(utcParts, 'second'),
  );
  // TZ tarafı: "Wall-clock time" kullanıyoruz; bu yüzden kendi Date.UTC'sine
  // değil, aynı Y-M-D h:m:s değerlerini direkt UTC instant'i gibi yazıp
  // gerçek UTC ile farkını ölçüyoruz.
  const tzAsUtcMs = Date.UTC(
    asNum(tzParts, 'year'),
    asNum(tzParts, 'month') - 1,
    asNum(tzParts, 'day'),
    norm(asNum(tzParts, 'hour')),
    asNum(tzParts, 'minute'),
    asNum(tzParts, 'second'),
  );
  return (tzAsUtcMs - utcMs) / 60000;
}

/**
 * "YYYY-MM-DD" + timezone için local midnight -> UTC Date.
 *
 * R-14 fix (önceki hali yanlıştı — TR/IQ 21:00 sonrası bir gün geri
 * düşüyordu). Yeni yaklaşım:
 *   1) Local midnight'i UTC instant olarak hayal et (`YYYY-MM-DDT00:00:00Z`)
 *   2) Bu UTC anının hedef TZ'deki wall-clock saatini ölç
 *   3) Wall-clock 00:00 olacak şekilde offset'i (dk) çıkar
 *   4) Sonuç = gerçek "local midnight"ı temsil eden UTC instant
 */
function parseLocalDateAtMidnight(ymd: string, tz: string): Date {
  const localMidnightGuess = new Date(`${ymd}T00:00:00.000Z`);
  const offsetMin = getTzOffsetMinutes(localMidnightGuess, tz);
  return new Date(localMidnightGuess.getTime() - offsetMin * 60000);
}

/**
 * Branch timezone'unda bugünün YYYY-MM-DD string'i.
 */
export function getTodayInBranch(
  branch: { country?: Country | string | null; timezone?: string | null } | null | undefined,
): string {
  const tz = branch?.timezone || getTimezone(branch?.country);
  return formatYmdInTimezone(new Date(), tz);
}

/**
 * Branch timezone'unda YYYY-MM-DD compact (YYYYMMDD).
 * Sıralı receipt no üretimi için kullanılır.
 */
export function formatYmd(branch: { country?: Country | string | null; timezone?: string | null } | null | undefined, date: Date = new Date()): string {
  const tz = branch?.timezone || getTimezone(branch?.country);
  return formatYmdInTimezone(date, tz).replace(/-/g, '');
}
