/**
 * Europe/Warsaw timezone utilities.
 * Store datetimes in DB as UTC; use these helpers for parsing (Warsaw → UTC) and
 * "today" / "start of week" boundaries in Warsaw.
 */
/**
 * Parse "YYYY-MM-DDTHH:mm" or "YYYY-MM-DD" as local time in Europe/Warsaw, return UTC Date.
 */
export declare function parseWarsawToUtc(value: string): Date;
/**
 * Start of today (midnight) in Europe/Warsaw as UTC Date.
 */
export declare function startOfTodayWarsaw(): Date;
/**
 * Start of week (Monday 00:00) and end of week (Sunday 23:59:59.999) in Europe/Warsaw, as UTC Dates.
 */
export declare function weekRangeWarsaw(): {
    start: Date;
    end: Date;
};
//# sourceMappingURL=warsawTz.d.ts.map