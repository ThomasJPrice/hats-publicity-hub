import { describe, expect, it } from "vitest";
import { addDays, instantRange, londonToday, weekRange } from "@/lib/dates";
import { daysToOpeningNight, nextKeyDates } from "@/lib/show";
import { bucketTasks } from "@/lib/task-buckets";

describe("weekRange (Monday to Sunday)", () => {
  it("returns Mon-Sun for a mid-week day", () => {
    // Wed 7 Oct 2026
    expect(weekRange("2026-10-07")).toEqual({ start: "2026-10-05", end: "2026-10-11" });
  });
  it("treats Sunday as the last day of its week", () => {
    expect(weekRange("2026-10-11")).toEqual({ start: "2026-10-05", end: "2026-10-11" });
  });
  it("treats Monday as the first day", () => {
    expect(weekRange("2026-10-12")).toEqual({ start: "2026-10-12", end: "2026-10-18" });
  });
  it("supports next week and crosses year ends", () => {
    expect(weekRange("2026-12-30", 1)).toEqual({ start: "2027-01-04", end: "2027-01-10" });
  });
});

describe("London clock changes", () => {
  it("londonToday uses London, not UTC, around midnight in summer", () => {
    expect(londonToday(new Date("2026-10-04T23:30:00Z"))).toBe("2026-10-05"); // 00:30 BST
    expect(londonToday(new Date("2026-12-04T23:30:00Z"))).toBe("2026-12-04"); // 23:30 GMT
  });
  it("week containing clocks going back (Sun 25 Oct 2026) is 169 hours", () => {
    const { from, to } = instantRange(weekRange("2026-10-21"));
    expect(from.toISOString()).toBe("2026-10-18T23:00:00.000Z"); // Mon 19 Oct 00:00 BST
    expect(to.toISOString()).toBe("2026-10-26T00:00:00.000Z"); // Mon 26 Oct 00:00 GMT
    expect((to.getTime() - from.getTime()) / 3_600_000).toBe(169);
  });
  it("week containing clocks going forward (Sun 28 Mar 2027) is 167 hours", () => {
    const { from, to } = instantRange(weekRange("2027-03-24"));
    expect(from.toISOString()).toBe("2027-03-22T00:00:00.000Z"); // Mon 22 Mar 00:00 GMT
    expect(to.toISOString()).toBe("2027-03-28T23:00:00.000Z"); // Mon 29 Mar 00:00 BST
    expect((to.getTime() - from.getTime()) / 3_600_000).toBe(167);
  });
  it("addDays is unaffected by the clock change", () => {
    expect(addDays("2026-10-24", 2)).toBe("2026-10-26");
    expect(addDays("2027-03-27", 2)).toBe("2027-03-29");
  });
});

describe("bucketTasks", () => {
  const t = (dueDate: string | null, status = "todo") => ({ dueDate, status });
  // Wed 7 Oct 2026: this week ends Sun 11 Oct; next week is 12-18 Oct.
  const today = "2026-10-07";

  it("splits open tasks into overdue / this week / next week", () => {
    const overdue = t("2026-10-06");
    const mon = t("2026-10-05"); // earlier this week but before today -> overdue
    const todayTask = t("2026-10-07");
    const sunday = t("2026-10-11");
    const nextMon = t("2026-10-12");
    const nextSun = t("2026-10-18");
    const later = t("2026-10-19");
    const b = bucketTasks([overdue, mon, todayTask, sunday, nextMon, nextSun, later], today);
    expect(b.overdue).toEqual([overdue, mon]);
    expect(b.thisWeek).toEqual([todayTask, sunday]);
    expect(b.nextWeek).toEqual([nextMon, nextSun]);
  });
  it("ignores done and undated tasks, keeps blocked ones", () => {
    const blocked = t("2026-10-01", "blocked");
    const b = bucketTasks([t("2026-10-01", "done"), t(null), blocked], today);
    expect(b.overdue).toEqual([blocked]);
    expect(b.thisWeek).toEqual([]);
  });
});

describe("show helpers", () => {
  it("counts days to opening night", () => {
    expect(daysToOpeningNight("2027-01-21")).toBe(1);
    expect(daysToOpeningNight("2026-10-05")).toBe(109);
  });
  it("lists the next key dates, keeping an in-progress range", () => {
    expect(nextKeyDates("2026-10-20", 2).map((k) => k.label)).toEqual([
      "Auditions",
      "Rehearsals begin (every Wednesday and Sunday)",
    ]);
  });
});
