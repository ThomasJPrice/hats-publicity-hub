import { and, asc, eq, gte, isNotNull, isNull, lt, lte, ne, sql, type SQL } from "drizzle-orm";
import type { Source, TaskCategory, TaskStatus } from "@/lib/constants";
import { db } from "@/lib/db";
import { tasks, type Task } from "@/lib/db/schema";
import { addDays, londonToday, weekRange } from "@/lib/dates";
import type { TaskCreate, TaskUpdate } from "@/lib/schemas";
import { logActivity } from "./activity";
import { archivePatch, changeSummary } from "./archive";

export type TaskFilters = {
  /** A single status, or "open" for everything not done. */
  status?: TaskStatus | "open";
  category?: TaskCategory;
  dueBefore?: string;
  dueAfter?: string;
  overdue?: boolean;
  thisWeek?: boolean;
  nextWeek?: boolean;
  includeArchived?: boolean;
};

export async function listTasks(filters: TaskFilters = {}, today = londonToday()): Promise<Task[]> {
  const where: SQL[] = filters.includeArchived ? [] : [isNull(tasks.archivedAt)];
  if (filters.status === "open") where.push(ne(tasks.status, "done"));
  else if (filters.status) where.push(eq(tasks.status, filters.status));
  if (filters.category) where.push(eq(tasks.category, filters.category));
  if (filters.dueBefore) where.push(lt(tasks.dueDate, filters.dueBefore));
  if (filters.dueAfter) where.push(gte(tasks.dueDate, filters.dueAfter));
  if (filters.overdue) where.push(ne(tasks.status, "done"), isNotNull(tasks.dueDate), lt(tasks.dueDate, today));
  for (const [flag, offset] of [
    [filters.thisWeek, 0],
    [filters.nextWeek, 1],
  ] as const) {
    if (flag) {
      const r = weekRange(today, offset);
      where.push(gte(tasks.dueDate, r.start), lte(tasks.dueDate, r.end));
    }
  }
  return db()
    .select()
    .from(tasks)
    .where(and(...where))
    .orderBy(
      sql`${tasks.dueDate} asc nulls last`,
      sql`case ${tasks.priority} when 'high' then 0 when 'normal' then 1 else 2 end`,
      asc(tasks.title),
    );
}

export async function getTask(id: string): Promise<Task | null> {
  const [row] = await db().select().from(tasks).where(eq(tasks.id, id));
  return row ?? null;
}

export async function createTask(input: TaskCreate, source: Source): Promise<Task> {
  const [row] = await db()
    .insert(tasks)
    .values({
      title: input.title,
      category: input.category,
      description: input.description ?? "",
      dueDate: input.dueDate ?? null,
      priority: input.priority ?? "normal",
      status: input.status ?? "todo",
      notes: input.notes ?? "",
      completedAt: input.status === "done" ? new Date() : null,
    })
    .returning();
  await logActivity(source, "task", row.id, `Created task: ${row.title}`);
  return row;
}

export async function updateTask(id: string, input: TaskUpdate, source: Source): Promise<Task> {
  const existing = await getTask(id);
  if (!existing) throw new Error(`Task ${id} not found`);
  const { archived, ...fields } = input;
  const patch: Partial<typeof tasks.$inferInsert> = { ...fields, ...archivePatch(archived) };
  if (input.status && input.status !== existing.status) {
    patch.completedAt = input.status === "done" ? new Date() : null;
  }
  const [row] = await db().update(tasks).set(patch).where(eq(tasks.id, id)).returning();
  await logActivity(source, "task", id, changeSummary("Updated", "task", row.title, input));
  return row;
}

export async function completeTask(id: string, source: Source, note?: string): Promise<Task> {
  const existing = await getTask(id);
  if (!existing) throw new Error(`Task ${id} not found`);
  const notes = note ? [existing.notes, note].filter(Boolean).join("\n") : existing.notes;
  const [row] = await db()
    .update(tasks)
    .set({ status: "done", completedAt: new Date(), notes })
    .where(eq(tasks.id, id))
    .returning();
  await logActivity(source, "task", id, `Completed task: ${row.title}${note ? ` (${note})` : ""}`);
  return row;
}

/** Push a task out by `days`, counting from today if it is already overdue. */
export async function shiftTask(id: string, days: number, source: Source, today = londonToday()): Promise<Task> {
  const existing = await getTask(id);
  if (!existing) throw new Error(`Task ${id} not found`);
  const base = existing.dueDate && existing.dueDate > today ? existing.dueDate : today;
  const dueDate = addDays(base, days);
  const [row] = await db().update(tasks).set({ dueDate }).where(eq(tasks.id, id)).returning();
  await logActivity(source, "task", id, `Moved task to ${dueDate}: ${row.title}`);
  return row;
}
