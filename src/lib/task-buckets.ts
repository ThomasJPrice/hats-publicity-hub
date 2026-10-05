import { weekRange } from "@/lib/dates";

type Bucketable = { dueDate: string | null; status: string };

export type TaskBuckets<T> = { overdue: T[]; thisWeek: T[]; nextWeek: T[] };

/**
 * Splits open tasks into three disjoint groups, relative to `today` (London):
 * - overdue: due before today
 * - thisWeek: due from today to the Sunday of this week
 * - nextWeek: due Monday to Sunday of next week
 */
export function bucketTasks<T extends Bucketable>(tasks: T[], today: string): TaskBuckets<T> {
  const thisWeek = weekRange(today, 0);
  const nextWeek = weekRange(today, 1);
  const out: TaskBuckets<T> = { overdue: [], thisWeek: [], nextWeek: [] };
  for (const t of tasks) {
    if (t.status === "done" || !t.dueDate) continue;
    if (t.dueDate < today) out.overdue.push(t);
    else if (t.dueDate <= thisWeek.end) out.thisWeek.push(t);
    else if (t.dueDate >= nextWeek.start && t.dueDate <= nextWeek.end) out.nextWeek.push(t);
  }
  return out;
}
