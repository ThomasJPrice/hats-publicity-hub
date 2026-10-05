import { daysBetween } from "@/lib/dates";

export const SHOW_TITLE = "The Wizard of Oz";
export const SHOW_NAME = "HATS Panto 2027";
export const OPENING_NIGHT = "2027-01-22";

export type KeyDate = { date: string; endDate?: string; label: string; proposed?: boolean };

export const KEY_DATES: KeyDate[] = [
  { date: "2026-10-07", label: "Readthrough" },
  { date: "2026-10-14", endDate: "2026-10-25", label: "Auditions", proposed: true },
  { date: "2026-10-28", label: "Rehearsals begin (every Wednesday and Sunday)" },
  { date: "2026-11-09", label: "Mailing-list pre-sale opens", proposed: true },
  { date: "2026-11-16", label: "General sale opens", proposed: true },
  { date: "2027-01-03", label: "Tech rehearsal" },
  { date: "2027-01-17", label: "Tech rehearsal" },
];

export type Performance = { date: string; time: string };

export const PERFORMANCES: Performance[] = [
  { date: "2027-01-22", time: "19:30" },
  { date: "2027-01-23", time: "14:30" },
  { date: "2027-01-23", time: "19:30" },
  { date: "2027-01-24", time: "14:30" },
  { date: "2027-01-29", time: "19:30" },
  { date: "2027-01-30", time: "14:30" },
  { date: "2027-01-30", time: "19:30" },
];

/** Key dates that haven't finished yet (a range counts until its end date), soonest first. */
export function nextKeyDates(today: string, count = 3): KeyDate[] {
  return KEY_DATES.filter((k) => (k.endDate ?? k.date) >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, count);
}

/** Whole days until opening night; negative once it has passed. */
export function daysToOpeningNight(today: string): number {
  return daysBetween(today, OPENING_NIGHT);
}

export function showInfo() {
  return {
    show: `${SHOW_NAME}: ${SHOW_TITLE}`,
    openingNight: OPENING_NIGHT,
    keyDates: KEY_DATES,
    performances: PERFORMANCES,
    note: "Dates marked proposed are unconfirmed.",
  };
}
