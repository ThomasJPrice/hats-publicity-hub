import { count } from "drizzle-orm";
import { db } from "@/lib/db";
import { keyDates, performances, posts, qrLinks, showSettings, tasks } from "@/lib/db/schema";
import { londonWallClockToDate } from "@/lib/dates";
import { defaultUtm, envDefaultDestinationUrl } from "@/lib/qr-url";
import { SEED_KEY_DATES, SEED_PERFORMANCES, SEED_POST_TIME, SEED_POSTS, SEED_QR_LINKS, SEED_SHOW, SEED_TASKS } from "./data";

type Table = typeof showSettings | typeof keyDates | typeof performances | typeof tasks | typeof posts | typeof qrLinks;

async function isEmpty(table: Table): Promise<boolean> {
  const [{ n }] = await db().select({ n: count() }).from(table);
  return n === 0;
}

/**
 * Loads starter data into each table that is completely empty (archived rows count as present).
 * Idempotent: re-running, or running after edits and archiving, never duplicates, overwrites or restores anything.
 * After the first run the database is the only source of truth.
 */
export async function runSeed(log: (msg: string) => void = () => {}) {
  const d = db();

  if (await isEmpty(showSettings)) {
    await d.insert(showSettings).values({
      ...SEED_SHOW,
      // The env var only seeds the setting on first run; edit it in the UI afterwards.
      defaultDestinationUrl: envDefaultDestinationUrl(),
    });
    log("Seeded show settings");
  }

  if (await isEmpty(keyDates)) {
    await d.insert(keyDates).values(SEED_KEY_DATES.map((k) => ({ ...k, isProposed: k.isProposed ?? false })));
    log(`Seeded ${SEED_KEY_DATES.length} key dates`);
  }

  if (await isEmpty(performances)) {
    await d.insert(performances).values(SEED_PERFORMANCES.map((t) => ({ startsAt: londonWallClockToDate(`${t}:00`) })));
    log(`Seeded ${SEED_PERFORMANCES.length} performances`);
  }

  if (await isEmpty(tasks)) {
    await d.insert(tasks).values(SEED_TASKS.map(([title, category, dueDate, priority]) => ({ title, category, dueDate, priority })));
    log(`Seeded ${SEED_TASKS.length} tasks`);
  }

  if (await isEmpty(posts)) {
    await d.insert(posts).values(
      SEED_POSTS.map(([date, channels, title, pillar]) => ({
        title,
        channels,
        pillar,
        scheduledFor: londonWallClockToDate(`${date}T${SEED_POST_TIME}:00`),
      })),
    );
    log(`Seeded ${SEED_POSTS.length} posts`);
  }

  if (await isEmpty(qrLinks)) {
    const [settings] = await d.select().from(showSettings).limit(1);
    await d.insert(qrLinks).values(
      SEED_QR_LINKS.map(([slug, label, placementType]) => ({
        slug,
        label,
        placementType,
        destinationUrl: settings.defaultDestinationUrl,
        ...defaultUtm(placementType, slug, settings.utmCampaign),
      })),
    );
    log(`Seeded ${SEED_QR_LINKS.length} QR links`);
  }
}
