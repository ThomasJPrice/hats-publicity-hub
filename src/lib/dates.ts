import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export const TZ = "Europe/London";

export type DateRange = { start: string; end: string };

function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Today's calendar date in London, as yyyy-MM-dd. */
export function londonToday(now: Date = new Date()): string {
  return formatInTimeZone(now, TZ, "yyyy-MM-dd");
}

/** Calendar-date arithmetic (no clock involved, so DST-proof). */
export function addDays(ymd: string, days: number): string {
  const d = parseYmd(ymd);
  d.setUTCDate(d.getUTCDate() + days);
  return formatYmd(d);
}

export function daysBetween(fromYmd: string, toYmd: string): number {
  return Math.round((parseYmd(toYmd).getTime() - parseYmd(fromYmd).getTime()) / 86_400_000);
}

/** 0 = Monday ... 6 = Sunday */
export function weekdayIndex(ymd: string): number {
  return (parseYmd(ymd).getUTCDay() + 6) % 7;
}

/** Monday to Sunday (inclusive) containing `today`, shifted by `offsetWeeks`. */
export function weekRange(today: string, offsetWeeks = 0): DateRange {
  const start = addDays(today, -weekdayIndex(today) + offsetWeeks * 7);
  return { start, end: addDays(start, 6) };
}

/** Midnight at the start of a London calendar day, as a UTC instant. */
export function londonDayStart(ymd: string): Date {
  return fromZonedTime(`${ymd}T00:00:00`, TZ);
}

/** Half-open instant range [from, to) covering the whole London days in `range`. */
export function instantRange(range: DateRange): { from: Date; to: Date } {
  return { from: londonDayStart(range.start), to: londonDayStart(addDays(range.end, 1)) };
}

/** Convert a "yyyy-MM-ddTHH:mm" London wall-clock value (e.g. from datetime-local) to an instant. */
export function londonWallClockToDate(local: string): Date {
  return fromZonedTime(local, TZ);
}

export function londonDateOf(instant: Date): string {
  return formatInTimeZone(instant, TZ, "yyyy-MM-dd");
}

export function londonTimeOf(instant: Date): string {
  return formatInTimeZone(instant, TZ, "HH:mm");
}

export function londonInputValue(instant: Date | null): string {
  return instant ? formatInTimeZone(instant, TZ, "yyyy-MM-dd'T'HH:mm") : "";
}

export function formatDay(ymd: string, pattern = "EEE d MMM"): string {
  return formatInTimeZone(londonDayStart(ymd), TZ, pattern);
}

export function formatInstant(instant: Date, pattern = "EEE d MMM, HH:mm"): string {
  return formatInTimeZone(instant, TZ, pattern);
}

/** Every date from start to end inclusive. */
export function eachDay(start: string, end: string): string[] {
  const out: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
}
