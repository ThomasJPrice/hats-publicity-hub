import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { count, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import type { PgTable } from "drizzle-orm/pg-core";
import { beforeAll, describe, expect, it, vi } from "vitest";
import * as schema from "@/lib/db/schema";

const client = new PGlite();
const testDb = drizzle(client, { schema });
vi.mock("@/lib/db", () => ({ db: () => testDb }));

import { runSeed } from "@/seed/run";
import { updateKeyDate, updatePerformance, updateShowSettings } from "@/lib/services/show";
import { updateTask } from "@/lib/services/tasks";
import { updateQrLink } from "@/lib/services/qr";
import { updatePost } from "@/lib/services/posts";

async function counts() {
  const n = async (t: PgTable) => (await testDb.select({ n: count() }).from(t))[0].n;
  return {
    settings: await n(schema.showSettings),
    keyDates: await n(schema.keyDates),
    performances: await n(schema.performances),
    tasks: await n(schema.tasks),
    posts: await n(schema.posts),
    qrLinks: await n(schema.qrLinks),
  };
}

beforeAll(async () => {
  process.env.DEFAULT_DESTINATION_URL = "https://tickets.example.com/from-env";
  const dir = path.resolve(import.meta.dirname, "../drizzle");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    for (const stmt of readFileSync(path.join(dir, file), "utf8").split("--> statement-breakpoint")) {
      if (stmt.trim()) await client.exec(stmt);
    }
  }
});

describe("seed", () => {
  it("loads everything into an empty database", async () => {
    await runSeed();
    expect(await counts()).toEqual({ settings: 1, keyDates: 8, performances: 7, tasks: 36, posts: 13, qrLinks: 9 });

    const [settings] = await testDb.select().from(schema.showSettings);
    expect(settings).toMatchObject({
      name: "HATS Panto 2027: The Wizard of Oz",
      utmCampaign: "wizard-of-oz-2027",
      defaultDestinationUrl: "https://tickets.example.com/from-env", // env var seeds the setting on first run
    });
    const perfs = await testDb.select().from(schema.performances).orderBy(schema.performances.startsAt);
    expect(perfs[0].startsAt.toISOString()).toBe("2027-01-22T19:30:00.000Z");
    const proposed = await testDb.select().from(schema.keyDates).where(eq(schema.keyDates.isProposed, true));
    expect(proposed.map((k) => k.label).sort()).toEqual([
      "Auditions, night 1",
      "Auditions, night 2",
      "General sale opens",
      "Mailing-list pre-sale opens",
    ]);
  });

  it("running it again changes nothing", async () => {
    const before = await counts();
    await runSeed();
    await runSeed();
    expect(await counts()).toEqual(before);
  });

  it("never duplicates, overwrites or restores after edits and archiving", async () => {
    const [task] = await testDb.select().from(schema.tasks).limit(1);
    const [kd] = await testDb.select().from(schema.keyDates).limit(1);
    const [perf] = await testDb.select().from(schema.performances).limit(1);
    const [post] = await testDb.select().from(schema.posts).limit(1);
    const [link] = await testDb.select().from(schema.qrLinks).limit(1);

    await updateTask(task.id, { title: "Edited title", archived: true }, "web");
    await updateKeyDate(kd.id, { label: "Edited label", archived: true }, "web");
    await updatePerformance(perf.id, { label: "Edited", archived: true }, "web");
    await updatePost(post.id, { title: "Edited post", archived: true }, "web");
    await updateQrLink(link.id, { label: "Edited link", destinationUrl: "https://tickets.example.com/elsewhere", archived: true }, "web");
    await updateShowSettings({ name: "Renamed show", defaultDestinationUrl: "https://tickets.example.com/edited" }, "web");

    const before = await counts();
    await runSeed();
    expect(await counts()).toEqual(before);

    const get = async <T extends { id: string }>(rows: Promise<T[]>) => (await rows)[0];
    expect(await get(testDb.select().from(schema.tasks).where(eq(schema.tasks.id, task.id)))).toMatchObject({ title: "Edited title" });
    expect((await get(testDb.select().from(schema.tasks).where(eq(schema.tasks.id, task.id)))).archivedAt).not.toBeNull();
    expect((await get(testDb.select().from(schema.keyDates).where(eq(schema.keyDates.id, kd.id)))).archivedAt).not.toBeNull();
    expect((await get(testDb.select().from(schema.performances).where(eq(schema.performances.id, perf.id)))).archivedAt).not.toBeNull();
    expect((await get(testDb.select().from(schema.posts).where(eq(schema.posts.id, post.id)))).archivedAt).not.toBeNull();
    expect(await get(testDb.select().from(schema.qrLinks).where(eq(schema.qrLinks.id, link.id)))).toMatchObject({
      label: "Edited link",
      destinationUrl: "https://tickets.example.com/elsewhere",
    });
    const [settings] = await testDb.select().from(schema.showSettings);
    expect(settings).toMatchObject({ name: "Renamed show", defaultDestinationUrl: "https://tickets.example.com/edited" });
  });

  it("fills only the tables that are empty (e.g. an existing database gaining the new show tables)", async () => {
    await testDb.delete(schema.qrScans);
    await testDb.delete(schema.qrLinks);
    await testDb.delete(schema.keyDates);
    await testDb.delete(schema.performances);
    await testDb.delete(schema.showSettings);
    const tasksBefore = (await counts()).tasks;
    await runSeed();
    const after = await counts();
    expect(after).toMatchObject({ settings: 1, keyDates: 8, performances: 7, qrLinks: 9, tasks: tasksBefore });
    expect(after.tasks).toBe(36);
  });
});
