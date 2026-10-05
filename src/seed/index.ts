import { count } from "drizzle-orm";
import { db } from "@/lib/db";
import { posts, qrLinks, tasks } from "@/lib/db/schema";
import { londonWallClockToDate } from "@/lib/dates";
import { defaultDestinationUrl, defaultUtm } from "@/lib/qr-url";
import { SEED_POST_TIME, SEED_POSTS, SEED_QR_LINKS, SEED_TASKS } from "./data";

/** Idempotent: tasks and posts load only into empty tables; links are skipped if the slug exists. */
async function main() {
  const d = db();

  const [{ n: taskCount }] = await d.select({ n: count() }).from(tasks);
  if (taskCount === 0) {
    await d.insert(tasks).values(
      SEED_TASKS.map(([title, category, dueDate, priority]) => ({ title, category, dueDate, priority })),
    );
    console.log(`Seeded ${SEED_TASKS.length} tasks`);
  } else {
    console.log(`Tasks already present (${taskCount}), skipping`);
  }

  const [{ n: postCount }] = await d.select({ n: count() }).from(posts);
  if (postCount === 0) {
    await d.insert(posts).values(
      SEED_POSTS.map(([date, channels, title, pillar]) => ({
        title,
        channels,
        pillar,
        scheduledFor: londonWallClockToDate(`${date}T${SEED_POST_TIME}:00`),
      })),
    );
    console.log(`Seeded ${SEED_POSTS.length} posts`);
  } else {
    console.log(`Posts already present (${postCount}), skipping`);
  }

  const destinationUrl = defaultDestinationUrl();
  const inserted = await d
    .insert(qrLinks)
    .values(
      SEED_QR_LINKS.map(([slug, label, placementType]) => ({
        slug,
        label,
        placementType,
        destinationUrl,
        ...defaultUtm(placementType, slug),
      })),
    )
    .onConflictDoNothing({ target: qrLinks.slug })
    .returning({ id: qrLinks.id });
  console.log(`Seeded ${inserted.length} new QR links (destination ${destinationUrl})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
