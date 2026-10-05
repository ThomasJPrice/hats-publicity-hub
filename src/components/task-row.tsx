import Link from "next/link";
import { completeTaskAction, shiftTaskAction } from "@/app/actions";
import type { Task } from "@/lib/db/schema";
import { formatDay } from "@/lib/dates";
import { ArchiveButton } from "./archive-button";
import { Badge, CategoryBadge, PriorityMark } from "./ui";

function ShiftButton({ id, days, label }: { id: string; days: number; label: string }) {
  return (
    <form action={shiftTaskAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="days" value={days} />
      <button className="btn btn-sm">{label}</button>
    </form>
  );
}

export function TaskRow({ task, today, actions = true, back = "/tasks" }: { task: Task; today: string; actions?: boolean; back?: string }) {
  const archived = task.archivedAt !== null;
  const done = task.status === "done";
  const overdue = !done && !archived && task.dueDate !== null && task.dueDate < today;
  return (
    <li className={`card ${archived ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <Link href={`/tasks/${task.id}`} className={`text-sm font-medium ${done ? "text-stone-400 line-through" : ""}`}>
          {task.title}
        </Link>
        {task.dueDate && (
          <span className={`shrink-0 text-xs ${overdue ? "font-semibold text-red-700" : "text-stone-500"}`}>
            {formatDay(task.dueDate)}
          </span>
        )}
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <CategoryBadge category={task.category} />
        <PriorityMark priority={task.priority} />
        {task.status !== "todo" && <Badge>{task.status}</Badge>}
        {archived && <Badge className="bg-stone-200 text-stone-700">Archived</Badge>}
      </div>
      {archived && (
        <div className="mt-2">
          <ArchiveButton entity="task" id={task.id} archived back={back} />
        </div>
      )}
      {actions && !done && !archived && (
        <div className="mt-2 flex gap-2">
          <form action={completeTaskAction}>
            <input type="hidden" name="id" value={task.id} />
            <button className="btn btn-sm btn-primary">Done</button>
          </form>
          <ShiftButton id={task.id} days={1} label="+1 day" />
          <ShiftButton id={task.id} days={7} label="+1 week" />
        </div>
      )}
    </li>
  );
}
