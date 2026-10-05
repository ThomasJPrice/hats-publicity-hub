import Link from "next/link";
import { addTaskAction } from "@/app/actions";
import { TASK_CATEGORIES, TASK_PRIORITIES, TASK_STATUSES, humanise } from "@/lib/constants";
import { formatDay, londonToday, weekRange } from "@/lib/dates";
import type { Task } from "@/lib/db/schema";
import { listTasks } from "@/lib/services/tasks";
import { Empty, ErrorNote, oneOf, qs } from "@/components/ui";
import { TaskRow } from "@/components/task-row";

type Params = { category?: string; status?: string; archived?: string; error?: string };

function groupByWeek(tasks: Task[], today: string) {
  const groups = new Map<string, { label: string; tasks: Task[] }>();
  const thisWeekStart = weekRange(today).start;
  for (const t of tasks) {
    const key = t.dueDate ? weekRange(t.dueDate).start : "none";
    if (!groups.has(key)) {
      const label =
        key === "none" ? "No due date" : key < thisWeekStart ? `Overdue: week of ${formatDay(key, "d MMM")}` : `Week of ${formatDay(key, "d MMM yyyy")}`;
      groups.set(key, { label, tasks: [] });
    }
    groups.get(key)!.tasks.push(t);
  }
  return [...groups.values()];
}

export default async function TasksPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const category = oneOf(sp.category, TASK_CATEGORIES);
  const status = oneOf(sp.status, [...TASK_STATUSES, "open", "all"] as const) ?? "open";
  const showArchived = sp.archived === "1";
  const arch = showArchived ? "1" : undefined;
  const today = londonToday();
  const tasks = await listTasks({ category, status: status === "all" ? undefined : status, includeArchived: showArchived }, today);
  const groups = groupByWeek(tasks, today);

  const chip = (label: string, href: string, active: boolean) => (
    <Link
      key={label}
      href={href}
      className={`shrink-0 rounded-full border px-3 py-1 text-xs ${active ? "border-brand bg-brand text-white" : "border-stone-300 bg-white"}`}
    >
      {label}
    </Link>
  );

  return (
    <div>
      <ErrorNote message={sp.error} />
      <form action={addTaskAction} className="card space-y-2">
        <input name="title" required placeholder="Add a task…" aria-label="Task title" className="input" />
        <div className="grid grid-cols-3 gap-2">
          <select name="category" aria-label="Category" defaultValue={category ?? "social"} className="input">
            {TASK_CATEGORIES.map((c) => (
              <option key={c} value={c}>{humanise(c)}</option>
            ))}
          </select>
          <input name="dueDate" type="date" aria-label="Due date" className="input" />
          <select name="priority" aria-label="Priority" defaultValue="normal" className="input">
            {TASK_PRIORITIES.map((p) => (
              <option key={p} value={p}>{humanise(p)}</option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary w-full">Add task</button>
      </form>

      <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {(["open", ...TASK_STATUSES, "all"] as const).map((s) =>
          chip(humanise(s), `/tasks${qs({ status: s === "open" ? undefined : s, category, archived: arch })}`, status === s),
        )}
      </div>
      <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1">
        {chip(showArchived ? "Hide archived" : "Show archived", `/tasks${qs({ status: status === "open" ? undefined : status, category, archived: showArchived ? undefined : "1" })}`, showArchived)}
        {chip("All categories", `/tasks${qs({ status: status === "open" ? undefined : status, archived: arch })}`, !category)}
        {TASK_CATEGORIES.map((c) =>
          chip(humanise(c), `/tasks${qs({ status: status === "open" ? undefined : status, category: c, archived: arch })}`, category === c),
        )}
      </div>

      {groups.length === 0 && (
        <div className="mt-4">
          <Empty>No tasks match.</Empty>
        </div>
      )}
      {groups.map((g) => (
        <section key={g.label}>
          <h2 className="h2">{g.label}</h2>
          <ul className="space-y-2">
            {g.tasks.map((t) => (
              <TaskRow key={t.id} task={t} today={today} back={`/tasks${qs({ status: status === "open" ? undefined : status, category, archived: arch })}`} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
