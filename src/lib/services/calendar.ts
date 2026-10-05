import type { Channel, PostStatus, TaskCategory } from "@/lib/constants";
import { eachDay, londonDateOf, londonTimeOf, type DateRange } from "@/lib/dates";
import { KEY_DATES, PERFORMANCES } from "@/lib/show";
import { listPostsInRange } from "./posts";
import { listTasks } from "./tasks";

export type CalendarItem = {
  date: string;
  time?: string;
  kind: "key" | "performance" | "post" | "task";
  title: string;
  /** Edit page, where the item is editable. */
  href?: string;
  /** Status / extra label, e.g. "idea" or "proposed". */
  meta?: string;
  done?: boolean;
};

export type CalendarFilters = { channel?: Channel; postStatus?: PostStatus; category?: TaskCategory };

export async function getCalendarItems(range: DateRange, filters: CalendarFilters = {}): Promise<CalendarItem[]> {
  const inRange = (d: string) => d >= range.start && d <= range.end;
  const items: CalendarItem[] = [];
  // Show dates are always shown; filters only narrow posts and tasks.
  for (const k of KEY_DATES) {
    for (const date of eachDay(k.date, k.endDate ?? k.date)) {
      if (inRange(date)) items.push({ date, kind: "key", title: k.label, meta: k.proposed ? "proposed" : undefined });
    }
  }
  for (const p of PERFORMANCES) {
    if (inRange(p.date)) items.push({ date: p.date, time: p.time, kind: "performance", title: "Performance" });
  }

  const [posts, tasks] = await Promise.all([
    listPostsInRange(range, { channel: filters.channel, status: filters.postStatus }),
    listTasks({ dueAfter: range.start, category: filters.category }).then((rows) =>
      rows.filter((t) => t.dueDate && t.dueDate <= range.end),
    ),
  ]);
  for (const p of posts) {
    if (!p.scheduledFor) continue;
    items.push({
      date: londonDateOf(p.scheduledFor),
      time: londonTimeOf(p.scheduledFor),
      kind: "post",
      title: p.title,
      href: `/posts/${p.id}`,
      meta: p.status,
    });
  }
  for (const t of tasks) {
    items.push({
      date: t.dueDate as string,
      kind: "task",
      title: t.title,
      href: `/tasks/${t.id}`,
      meta: t.status,
      done: t.status === "done",
    });
  }
  const order = { key: 0, performance: 1, post: 2, task: 3 } as const;
  return items.sort(
    (a, b) => a.date.localeCompare(b.date) || order[a.kind] - order[b.kind] || (a.time ?? "").localeCompare(b.time ?? ""),
  );
}
