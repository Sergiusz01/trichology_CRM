/**
 * Europe/Warsaw timezone utilities.
 * Store datetimes in DB as UTC; use these helpers for parsing (Warsaw → UTC) and
 * "today" / "start of week" boundaries in Warsaw.
 */

import { toDate } from 'date-fns-tz';

const TZ = 'Europe/Warsaw';

function partsNow(fmt: Intl.DateTimeFormatOptions): Record<string, string> {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, ...fmt }).formatToParts(new Date());
  return Object.fromEntries(p.filter((x) => x.type !== 'literal').map((x) => [x.type, x.value]));
}

/**
 * Parse "YYYY-MM-DDTHH:mm" or "YYYY-MM-DD" as local time in Europe/Warsaw, return UTC Date.
 */
export function parseWarsawToUtc(value: string): Date {
  let s = value.trim();
  if (!s.includes('T')) {
    s = `${s}T00:00:00`;
  } else if (/T\d{1,2}:\d{2}$/.test(s)) {
    s = `${s}:00`;
  }
  return toDate(s, { timeZone: TZ });
}

/**
 * Start of today (midnight) in Europe/Warsaw as UTC Date.
 */
export function startOfTodayWarsaw(): Date {
  const { year, month, day } = partsNow({ year: 'numeric', month: '2-digit', day: '2-digit' });
  return toDate(`${year}-${month}-${day}T00:00:00`, { timeZone: TZ });
}

/**
 * Start of week (Monday 00:00) and end of week (Sunday 23:59:59.999) in Europe/Warsaw, as UTC Dates.
 */
export function weekRangeWarsaw(): { start: Date; end: Date } {
  const { year, month, day, weekday } = partsNow({
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });
  const y = parseInt(year, 10);
  const mo = parseInt(month, 10) - 1;
  const d = parseInt(day, 10);
  const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday);
  const toMon = dow <= 0 ? 6 : dow - 1;
  const utc = new Date(Date.UTC(y, mo, d, 12, 0, 0));
  const ms = utc.getTime() - toMon * 24 * 60 * 60 * 1000;
  const monday = new Date(ms);
  const sunMs = ms + 6 * 24 * 60 * 60 * 1000;
  const sunday = new Date(sunMs);
  const pad = (n: number) => String(n).padStart(2, '0');
  const ym = (x: Date) =>
    `${x.getUTCFullYear()}-${pad(x.getUTCMonth() + 1)}-${pad(x.getUTCDate())}`;
  const start = toDate(`${ym(monday)}T00:00:00`, { timeZone: TZ });
  const end = toDate(`${ym(sunday)}T23:59:59.999`, { timeZone: TZ });
  return { start, end };
}
