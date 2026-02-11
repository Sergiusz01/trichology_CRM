"use strict";
/**
 * Europe/Warsaw timezone utilities.
 * Store datetimes in DB as UTC; use these helpers for parsing (Warsaw → UTC) and
 * "today" / "start of week" boundaries in Warsaw.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseWarsawToUtc = parseWarsawToUtc;
exports.startOfTodayWarsaw = startOfTodayWarsaw;
exports.weekRangeWarsaw = weekRangeWarsaw;
const date_fns_tz_1 = require("date-fns-tz");
const TZ = 'Europe/Warsaw';
function partsNow(fmt) {
    const p = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, ...fmt }).formatToParts(new Date());
    return Object.fromEntries(p.filter((x) => x.type !== 'literal').map((x) => [x.type, x.value]));
}
/**
 * Parse "YYYY-MM-DDTHH:mm" or "YYYY-MM-DD" as local time in Europe/Warsaw, return UTC Date.
 */
function parseWarsawToUtc(value) {
    let s = value.trim();
    if (!s.includes('T')) {
        s = `${s}T00:00:00`;
    }
    else if (/T\d{1,2}:\d{2}$/.test(s)) {
        s = `${s}:00`;
    }
    return (0, date_fns_tz_1.toDate)(s, { timeZone: TZ });
}
/**
 * Start of today (midnight) in Europe/Warsaw as UTC Date.
 */
function startOfTodayWarsaw() {
    const { year, month, day } = partsNow({ year: 'numeric', month: '2-digit', day: '2-digit' });
    return (0, date_fns_tz_1.toDate)(`${year}-${month}-${day}T00:00:00`, { timeZone: TZ });
}
/**
 * Start of week (Monday 00:00) and end of week (Sunday 23:59:59.999) in Europe/Warsaw, as UTC Dates.
 */
function weekRangeWarsaw() {
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
    const pad = (n) => String(n).padStart(2, '0');
    const ym = (x) => `${x.getUTCFullYear()}-${pad(x.getUTCMonth() + 1)}-${pad(x.getUTCDate())}`;
    const start = (0, date_fns_tz_1.toDate)(`${ym(monday)}T00:00:00`, { timeZone: TZ });
    const end = (0, date_fns_tz_1.toDate)(`${ym(sunday)}T23:59:59.999`, { timeZone: TZ });
    return { start, end };
}
//# sourceMappingURL=warsawTz.js.map