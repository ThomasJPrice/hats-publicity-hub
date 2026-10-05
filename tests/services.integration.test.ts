import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { beforeAll, describe, expect, it, vi } from "vitest";
import * as schema from "@/lib/db/schema";

// Real Postgres semantics (in-memory) for the service layer; the app itself uses Neon.
const client = new PGlite();
const testDb = drizzle(client, { schema });
vi.mock("@/lib/db", () => ({ db: () => testDb }));

import { listActivity } from "@/lib/services/activity";
import { getCalendarItems } from "@/lib/services/calendar";
import { createPost, listPosts, updatePost } from "@/lib/services/posts";
import { createQrLink, getQrOverview, recordScan, updateQrLink } from "@/lib/services/qr";
import {
  createKeyDate,
  createPerformance,
  getShowInfo,
  getShowSettings,
  listPerformances,
  updateKeyDate,
  updatePerformance,
  updateShowSettings,
} from "@/lib/services/show";
import { getStatusSummary } from "@/lib/services/summary";
import { completeTask, createTask, listTasks, shiftTask, updateTask } from "@/lib/services/tasks";

beforeAll(async () => {
  process.env.BASE_URL = "https://go.example.org";
  process.env.DEFAULT_DESTINATION_URL = "https://tickets.example.com/event";
  const dir = path.resolve(import.meta.dirname, "../drizzle");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    for (const stmt of readFileSync(path.join(dir, file), "utf8").split("--> statement-breakpoint")) {
      if (stmt.trim()) await client.exec(stmt);
    }
  }
});

describe("show settings, key dates and performances", () => {
  it("falls back to defaults before any settings row exists, then persists edits", async () => {
    const before = await getShowSettings();
    expect(before.id).toBeNull();
    expect(before.defaultDestinationUrl).toBe("https://tickets.example.com/event");

    const row = await updateShowSettings({ name: "Test Show", utmCampaign: "camp-1" }, "web");
    expect(row).toMatchObject({ name: "Test Show", utmCampaign: "camp-1", defaultDestinationUrl: "https://tickets.example.com/event" });
    await updateShowSettings({ defaultDestinationUrl: "https://tickets.example.com/new" }, "mcp");
    expect(await getShowSettings()).toMatchObject({ name: "Test Show", defaultDestinationUrl: "https://tickets.example.com/new" });
    expect(await testDb.select().from(schema.showSettings)).toHaveLength(1); // still a single row
  });

  it("derives opening night and the countdown from non-archived performances", async () => {
    const a = await createPerformance({ startsAt: "2027-01-23T19:30:00+00:00" }, "web");
    const opening = await createPerformance({ startsAt: "2027-01-22T19:30:00+00:00", label: "Opening" }, "mcp");
    expect((await getShowInfo()).openingNight).toBe("2027-01-22");
    expect((await getStatusSummary("2026-10-07")).daysToOpeningNight).toBe(107);

    // Move opening night, then archive it: the countdown follows.
    await updatePerformance(opening.id, { startsAt: "2027-01-21T19:30:00+00:00" }, "web");
    expect((await getStatusSummary("2026-10-07")).daysToOpeningNight).toBe(106);
    await updatePerformance(opening.id, { archived: true }, "mcp");
    expect((await getStatusSummary("2026-10-07")).daysToOpeningNight).toBe(108);
    expect((await listPerformances()).map((p) => p.id)).toEqual([a.id]);
    expect(await listPerformances(true)).toHaveLength(2);
    expect((await getShowInfo(true)).openingNight).toBe("2027-01-23"); // archived ones don't drive it

    // Restore and put it back to the real opening night.
    await updatePerformance(opening.id, { archived: false, startsAt: "2027-01-22T19:30:00+00:00" }, "web");
    expect((await getShowInfo()).openingNight).toBe("2027-01-22");
  });

  it("edits, archives and restores key dates; rejects a backwards range", async () => {
    const k = await createKeyDate({ label: "Auditions", date: "2026-10-14", endDate: "2026-10-25", kind: "audition", isProposed: true }, "web");
    await expect(updateKeyDate(k.id, { endDate: "2026-10-01" }, "web")).rejects.toThrow(/before the start/);
    await updateKeyDate(k.id, { isProposed: false, endDate: null }, "mcp");
    expect((await getShowInfo()).keyDates[0]).toMatchObject({ label: "Auditions", isProposed: false, endDate: null });
    await updateKeyDate(k.id, { archived: true }, "web");
    expect((await getShowInfo()).keyDates).toHaveLength(0);
    expect((await getShowInfo(true)).keyDates).toHaveLength(1);
    await updateKeyDate(k.id, { archived: false }, "web");
    expect((await getShowInfo()).keyDates).toHaveLength(1);

    const summary = await getStatusSummary("2026-10-10");
    expect(summary.nextKeyDates.map((d) => d.label)).toEqual(["Auditions"]);
  });
});

describe("tasks", () => {
  const today = "2026-10-07"; // Wednesday

  it("buckets, filters, completes and shifts", async () => {
    const overdue = await createTask({ title: "Overdue", category: "print", dueDate: "2026-10-01" }, "web");
    const soon = await createTask({ title: "Soon", category: "social", dueDate: "2026-10-09", priority: "high" }, "web");
    await createTask({ title: "Next week", category: "email", dueDate: "2026-10-14" }, "mcp");
    const done = await createTask({ title: "Already done", category: "admin", dueDate: "2026-10-02" }, "web");
    await completeTask(done.id, "web", "sorted");

    expect((await listTasks({ overdue: true }, today)).map((t) => t.title)).toEqual(["Overdue"]);
    expect((await listTasks({ thisWeek: true }, today)).map((t) => t.title)).toEqual(["Soon"]);
    expect((await listTasks({ nextWeek: true }, today)).map((t) => t.title)).toEqual(["Next week"]);
    expect((await listTasks({ status: "open", category: "social" }, today)).map((t) => t.title)).toEqual(["Soon"]);

    const summary = await getStatusSummary(today);
    expect(summary.overdue.map((t) => t.title)).toEqual(["Overdue"]);
    expect(summary.thisWeek.map((t) => t.title)).toEqual(["Soon"]);
    expect(summary.nextWeek.map((t) => t.title)).toEqual(["Next week"]);

    // Overdue tasks are pushed from today, not from their stale date.
    expect((await shiftTask(overdue.id, 1, "web", today)).dueDate).toBe("2026-10-08");
    expect((await shiftTask(soon.id, 7, "web", today)).dueDate).toBe("2026-10-16");
    expect((await listTasks({ status: "done" }, today))[0].notes).toBe("sorted");
  });

  it("archives and restores, hiding archived tasks everywhere by default", async () => {
    const t = await createTask({ title: "Archive me", category: "admin", dueDate: "2026-10-08" }, "web");
    await updateTask(t.id, { archived: true }, "mcp");
    expect((await listTasks({}, today)).some((x) => x.id === t.id)).toBe(false);
    expect((await listTasks({ includeArchived: true }, today)).find((x) => x.id === t.id)?.archivedAt).toBeInstanceOf(Date);
    expect((await getStatusSummary(today)).thisWeek.some((x) => x.id === t.id)).toBe(false);
    await updateTask(t.id, { archived: false }, "web");
    expect((await listTasks({}, today)).some((x) => x.id === t.id)).toBe(true);
  });

  it("logs activity from both sources, including archive and restore", async () => {
    const log = await listActivity(undefined, 200);
    expect(log.some((a) => a.source === "mcp")).toBe(true);
    expect(log.some((a) => a.source === "web" && a.summary.startsWith("Completed task"))).toBe(true);
    expect(log.some((a) => a.summary.startsWith("Archived task: Archive me"))).toBe(true);
    expect(log.some((a) => a.summary.startsWith("Restored task: Archive me"))).toBe(true);
  });
});

describe("posts and calendar", () => {
  it("filters by channel/status/date and places items on London days", async () => {
    // 23:30 UTC on 11 Oct 2026 is 00:30 BST on 12 Oct in London.
    const late = await createPost({ title: "Late post", scheduledFor: "2026-10-11T23:30:00Z", channels: ["facebook", "tiktok"], status: "drafted" }, "web");
    await createPost({ title: "Other", scheduledFor: "2026-10-20T09:00:00+01:00", channels: ["email"] }, "web");

    expect((await listPosts({ channel: "tiktok" })).map((p) => p.title)).toEqual(["Late post"]);
    expect((await listPosts({ status: "drafted" })).map((p) => p.title)).toEqual(["Late post"]);
    expect((await listPosts({ from: "2026-10-12", to: "2026-10-12" })).map((p) => p.title)).toEqual(["Late post"]);
    expect(await listPosts({ from: "2026-10-05", to: "2026-10-11" })).toHaveLength(0);

    const items = await getCalendarItems({ start: "2026-10-12", end: "2026-10-18" });
    expect(items.find((i) => i.kind === "post")).toMatchObject({ date: "2026-10-12", time: "00:30" });
    // Key dates and performances come from the database, with the proposed flag
    await createKeyDate({ label: "Audition night", date: "2026-10-14", isProposed: true }, "web");
    const withKey = await getCalendarItems({ start: "2026-10-12", end: "2026-10-18" });
    expect(withKey.some((i) => i.kind === "key" && i.title === "Audition night" && i.meta === "proposed")).toBe(true);
    const perfWeek = await getCalendarItems({ start: "2027-01-18", end: "2027-01-24" });
    expect(perfWeek.filter((i) => i.kind === "performance").map((i) => `${i.date} ${i.time}`)).toEqual([
      "2027-01-22 19:30",
      "2027-01-23 19:30",
    ]);

    // Archiving a post removes it from lists and the calendar; restoring brings it back.
    await updatePost(late.id, { archived: true }, "mcp");
    expect(await listPosts({ channel: "tiktok" })).toHaveLength(0);
    expect((await listPosts({ channel: "tiktok", includeArchived: true })).map((p) => p.title)).toEqual(["Late post"]);
    expect((await getCalendarItems({ start: "2026-10-12", end: "2026-10-18" })).some((i) => i.kind === "post")).toBe(false);
    await updatePost(late.id, { archived: false }, "web");
    expect(await listPosts({ channel: "tiktok" })).toHaveLength(1);
  });
});

describe("QR links and stats", () => {
  it("creates links using the show settings for UTM campaign and destination; rejects duplicate slugs", async () => {
    const link = await createQrLink({ label: "A3 poster & Co-op", placementType: "poster_a3" }, "web");
    expect(link.slug).toBe("a3-poster-and-co-op");
    expect(link).toMatchObject({
      destinationUrl: "https://tickets.example.com/new", // edited in show settings above
      utmSource: "poster_a3",
      utmMedium: "print",
      utmCampaign: "camp-1",
      utmContent: "a3-poster-and-co-op",
    });
    await expect(createQrLink({ label: "again", slug: link.slug, placementType: "other" }, "web")).rejects.toThrow(/already in use/);

    await updateShowSettings({ utmCampaign: "camp-2" }, "web");
    const next = await createQrLink({ label: "Second", placementType: "banner", slug: "second" }, "web");
    expect(next.utmCampaign).toBe("camp-2");
    expect((await getQrOverview(7)).links.find((l) => l.slug === link.slug)?.utmCampaign).toBe("camp-1"); // existing links untouched
  });

  it("counts human scans only, per link, per day and per placement", async () => {
    const a = await createQrLink({ label: "Leaflet", placementType: "leaflet_a6", slug: "leaflet" }, "web");
    const b = await createQrLink({ label: "Programme", placementType: "programme", slug: "prog" }, "web");
    await recordScan({ linkId: a.id, deviceClass: "mobile", isBot: false });
    await recordScan({ linkId: a.id, deviceClass: "mobile", isBot: false });
    await recordScan({ linkId: a.id, deviceClass: "desktop", isBot: true });
    await recordScan({ linkId: a.id, deviceClass: "desktop", isBot: true });
    await recordScan({ linkId: b.id, deviceClass: "unknown", isBot: true });

    const overview = await getQrOverview(7);
    const la = overview.links.find((l) => l.slug === "leaflet")!;
    const lb = overview.links.find((l) => l.slug === "prog")!;
    expect(la).toMatchObject({ totalScans: 2, last7Days: 2, periodScans: 2 });
    expect(la.lastScannedAt).toBeInstanceOf(Date);
    expect(la.daily).toHaveLength(7);
    expect(la.daily.reduce((n, d) => n + d.count, 0)).toBe(2);
    expect(lb).toMatchObject({ totalScans: 0, last7Days: 0, lastScannedAt: null });
    expect(overview.byPlacement.find((p) => p.placementType === "leaflet_a6")?.totalScans).toBe(2);
    expect(overview.byPlacement.find((p) => p.placementType === "programme")?.totalScans).toBe(0);
  });

  it("repointing is logged; every field but the slug is editable; archive hides and restores", async () => {
    const link = await createQrLink({ label: "Repoint me", placementType: "banner", slug: "repoint" }, "web");
    const edited = await updateQrLink(
      link.id,
      { destinationUrl: "https://tickets.example.com/other", label: "Renamed", placementType: "noticeboard", utmMedium: "poster", utmCampaign: "x", utmSource: "s", utmContent: "c", notes: "n", isActive: false },
      "mcp",
    );
    expect(edited).toMatchObject({ slug: "repoint", label: "Renamed", placementType: "noticeboard", utmMedium: "poster", notes: "n", isActive: false });
    expect((await listActivity(undefined, 200)).some((a) => a.summary.includes("https://tickets.example.com/new -> https://tickets.example.com/other"))).toBe(true);

    await updateQrLink(link.id, { archived: true }, "web");
    expect((await getQrOverview(7)).links.some((l) => l.slug === "repoint")).toBe(false);
    expect((await getQrOverview(7, undefined, true)).links.some((l) => l.slug === "repoint")).toBe(true);
    await updateQrLink(link.id, { archived: false }, "web");
    expect((await getQrOverview(7)).links.some((l) => l.slug === "repoint")).toBe(true);
  });
});
