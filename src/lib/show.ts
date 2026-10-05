import { daysBetween, londonDateOf } from "@/lib/dates";
import type { KeyDate, Performance } from "@/lib/db/schema";

/** Opening night is derived: the London date of the earliest performance passed in (callers pass non-archived ones). */
export function openingNightOf(performances: Pick<Performance, "startsAt">[]): string | null {
  if (performances.length === 0) return null;
  const earliest = performances.reduce((a, b) => (b.startsAt < a.startsAt ? b : a));
  return londonDateOf(earliest.startsAt);
}

/** Whole days until opening night; negative once it has passed; null if there are no performances. */
export function daysToOpeningNight(performances: Pick<Performance, "startsAt">[], today: string): number | null {
  const opening = openingNightOf(performances);
  return opening === null ? null : daysBetween(today, opening);
}

/** Key dates that haven't finished yet (a range counts until its end date), soonest first. */
export function nextKeyDates<T extends Pick<KeyDate, "date" | "endDate">>(keyDates: T[], today: string, count = 3): T[] {
  return keyDates
    .filter((k) => (k.endDate ?? k.date) >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, count);
}
