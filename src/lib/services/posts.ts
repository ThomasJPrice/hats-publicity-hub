import { and, asc, arrayContains, eq, gte, isNull, lt, sql, type SQL } from "drizzle-orm";
import type { Channel, PostStatus, Source } from "@/lib/constants";
import { db } from "@/lib/db";
import { posts, type Post } from "@/lib/db/schema";
import { instantRange, type DateRange } from "@/lib/dates";
import type { PostCreate, PostUpdate } from "@/lib/schemas";
import { logActivity } from "./activity";
import { archivePatch, changeSummary } from "./archive";

export type PostFilters = {
  /** Inclusive London calendar dates. */
  from?: string;
  to?: string;
  status?: PostStatus;
  channel?: Channel;
  includeArchived?: boolean;
};

export async function listPosts(filters: PostFilters = {}): Promise<Post[]> {
  const where: SQL[] = filters.includeArchived ? [] : [isNull(posts.archivedAt)];
  if (filters.from) where.push(gte(posts.scheduledFor, instantRange({ start: filters.from, end: filters.from }).from));
  if (filters.to) where.push(lt(posts.scheduledFor, instantRange({ start: filters.to, end: filters.to }).to));
  if (filters.status) where.push(eq(posts.status, filters.status));
  if (filters.channel) where.push(arrayContains(posts.channels, [filters.channel]));
  return db()
    .select()
    .from(posts)
    .where(and(...where))
    .orderBy(sql`${posts.scheduledFor} asc nulls last`, asc(posts.title));
}

export async function listPostsInRange(range: DateRange, filters: Pick<PostFilters, "status" | "channel" | "includeArchived"> = {}) {
  return listPosts({ from: range.start, to: range.end, ...filters });
}

export async function getPost(id: string): Promise<Post | null> {
  const [row] = await db().select().from(posts).where(eq(posts.id, id));
  return row ?? null;
}

export async function createPost(input: PostCreate, source: Source): Promise<Post> {
  const [row] = await db()
    .insert(posts)
    .values({
      title: input.title,
      scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : null,
      channels: input.channels ?? [],
      pillar: input.pillar ?? "practical",
      caption: input.caption ?? "",
      visualBrief: input.visualBrief ?? "",
      assetLink: input.assetLink ?? "",
      status: input.status ?? "idea",
      notes: input.notes ?? "",
    })
    .returning();
  await logActivity(source, "post", row.id, `Created post: ${row.title}`);
  return row;
}

export async function updatePost(id: string, input: PostUpdate, source: Source): Promise<Post> {
  const { scheduledFor, archived, ...rest } = input;
  const patch: Partial<typeof posts.$inferInsert> = { ...rest, ...archivePatch(archived) };
  if (scheduledFor !== undefined) patch.scheduledFor = scheduledFor ? new Date(scheduledFor) : null;
  const [row] = await db().update(posts).set(patch).where(eq(posts.id, id)).returning();
  if (!row) throw new Error(`Post ${id} not found`);
  await logActivity(source, "post", id, changeSummary("Updated", "post", row.title, input));
  return row;
}
