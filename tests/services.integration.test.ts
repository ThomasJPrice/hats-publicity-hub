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
import { createPost, listPosts } from "@/lib/services/posts";
import { createQrLink, getQrOverview, recordScan, updateQrLink } from "@/lib/services/qr";
import { getStatusSummary } from "@/lib/services/summary";
import { completeTask, createTask, listTasks, shiftTask } from "@/lib/services/tasks";

beforeAll(async () => {
  process.env.BASE_URL = "https://go.example.org";
  process.env.DEFAULT_DESTINATION_URL = "https://tickets.example.com/event";
  const dir = path.resolve(__dirname, "../drizzle");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    for (const stmt of readFileSync(path.join(dir, file), "utf8").split("--> statement-breakpoint")) {
      if (stmt.trim()) await client.exec(stmt);
    }
  }
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
    expect(summary.daysToOpeningNight).toBe(107);

    // Overdue tasks are pushed from today, not from their stale date.
    expect((await shiftTask(overdue.id, 1, "web", today)).dueDate).toBe("2026-10-08");
    expect((await shiftTask(soon.id, 7, "web", today)).dueDate).toBe("2026-10-16");
    expect((await listTasks({ status: "done" }, today))[0].notes).toBe("sorted");
  });

  it("logs activity from both sources", async () => {
    const log = await listActivity();
    expect(log.some((a) => a.source === "mcp")).toBe(true);
    expect(log.some((a) => a.source === "web" && a.summary.startsWith("Completed task"))).toBe(true);
  });
});

describe("posts and calendar", () => {
  it("filters by channel/status/date and places items on London days", async () => {
    // 23:30 UTC on 11 Oct 2026 is 00:30 BST on 12 Oct in London.
    await createPost({ title: "Late post", scheduledFor: "2026-10-11T23:30:00Z", channels: ["facebook", "tiktok"], status: "drafted" }, "web");
    await createPost({ title: "Other", scheduledFor: "2026-10-20T09:00:00+01:00", channels: ["email"] }, "web");

    expect((await listPosts({ channel: "tiktok" })).map((p) => p.title)).toEqual(["Late post"]);
    expect((await listPosts({ status: "drafted" })).map((p) => p.title)).toEqual(["Late post"]);
    expect((await listPosts({ from: "2026-10-12", to: "2026-10-12" })).map((p) => p.title)).toEqual(["Late post"]);
    expect(await listPosts({ from: "2026-10-05", to: "2026-10-11" })).toHaveLength(0);

    const items = await getCalendarItems({ start: "2026-10-12", end: "2026-10-18" });
    const post = items.find((i) => i.kind === "post");
    expect(post).toMatchObject({ date: "2026-10-12", time: "00:30" });
    expect(items.some((i) => i.kind === "key" && i.title === "Auditions" && i.meta === "proposed")).toBe(true);
    expect(items.some((i) => i.kind === "task")).toBe(true);
  });
});

describe("QR links and stats", () => {
  it("creates links with default UTM and rejects duplicate slugs", async () => {
    const link = await createQrLink({ label: "A3 poster & Co-op", placementType: "poster_a3" }, "web");
    expect(link.slug).toBe("a3-poster-and-co-op");
    expect(link).toMatchObject({
      destinationUrl: "https://tickets.example.com/event",
      utmSource: "poster_a3",
      utmMedium: "print",
      utmCampaign: "wizard-of-oz-2027",
      utmContent: "a3-poster-and-co-op",
    });
    await expect(createQrLink({ label: "again", slug: link.slug, placementType: "other" }, "web")).rejects.toThrow(/already in use/);
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

  it("repointing is logged with old and new destination", async () => {
    const link = await createQrLink({ label: "Repoint me", placementType: "banner", slug: "repoint" }, "web");
    await updateQrLink(link.id, { destinationUrl: "https://tickets.example.com/new" }, "mcp");
    const log = await listActivity();
    expect(log.some((a) => a.summary.includes("https://tickets.example.com/event -> https://tickets.example.com/new"))).toBe(true);
  });
});
