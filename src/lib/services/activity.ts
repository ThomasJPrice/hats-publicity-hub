import { desc, gte } from "drizzle-orm";
import type { Source } from "@/lib/constants";
import { db } from "@/lib/db";
import { activityLog } from "@/lib/db/schema";

export async function logActivity(
  source: Source,
  entityType: string,
  entityId: string | null,
  summary: string,
) {
  await db().insert(activityLog).values({ source, entityType, entityId, summary });
}

export async function listActivity(since?: Date, limit = 50) {
  const q = db().select().from(activityLog);
  const rows = since ? q.where(gte(activityLog.at, since)) : q;
  return rows.orderBy(desc(activityLog.at)).limit(limit);
}
