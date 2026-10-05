import Link from "next/link";
import { formatDay, formatInstant, londonToday } from "@/lib/dates";
import { listActivity } from "@/lib/services/activity";
import { getStatusSummary } from "@/lib/services/summary";
import { Badge, Empty, PostStatusBadge } from "@/components/ui";
import { TaskRow } from "@/components/task-row";
import type { Task } from "@/lib/db/schema";

function TaskSection({ title, tasks, today, tone }: { title: string; tasks: Task[]; today: string; tone?: string }) {
  return (
    <section>
      <h2 className={`h2 ${tone ?? ""}`}>
        {title} <span className="font-normal">({tasks.length})</span>
      </h2>
      {tasks.length === 0 ? (
        <Empty>Nothing here.</Empty>
      ) : (
        <ul className="space-y-2">
          {tasks.map((t) => (
            <TaskRow key={t.id} task={t} today={today} />
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function HomePage() {
  const today = londonToday();
  const [s, activity] = await Promise.all([getStatusSummary(today), listActivity(undefined, 8)]);

  return (
    <div>
      <p className="text-sm text-stone-500">Today is {formatDay(today, "EEEE d MMMM yyyy")}</p>

      <TaskSection title="Overdue" tasks={s.overdue} today={today} tone="text-red-700" />
      <TaskSection title="Due this week" tasks={s.thisWeek} today={today} />
      <TaskSection title="Due next week" tasks={s.nextWeek} today={today} />

      <section>
        <h2 className="h2">Posts this week</h2>
        {s.postsThisWeek.length === 0 ? (
          <Empty>No posts planned this week.</Empty>
        ) : (
          <ul className="space-y-2">
            {s.postsThisWeek.map((p) => (
              <li key={p.id} className="card flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <Link href={`/posts/${p.id}`} className="block truncate text-sm font-medium">
                    {p.title}
                  </Link>
                  <span className="text-xs text-stone-500">
                    {p.scheduledFor ? formatInstant(p.scheduledFor) : "Unscheduled"} · {p.channels.join(", ")}
                  </span>
                </div>
                <PostStatusBadge status={p.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="h2">Next key dates</h2>
        <ul className="space-y-2">
          {s.nextKeyDates.map((k) => (
            <li key={k.date + k.label} className="card flex items-center justify-between gap-2 text-sm">
              <span>{k.label}</span>
              <span className="flex shrink-0 items-center gap-1.5 text-xs text-stone-500">
                {k.proposed && <Badge className="bg-amber-100 text-amber-800">proposed</Badge>}
                {formatDay(k.date)}
                {k.endDate ? ` to ${formatDay(k.endDate)}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {activity.length > 0 && (
        <section>
          <h2 className="h2">Recent activity</h2>
          <ul className="space-y-1 text-xs text-stone-600">
            {activity.map((a) => (
              <li key={a.id}>
                <span className="text-stone-400">{formatInstant(a.at, "d MMM HH:mm")}</span> {a.summary}
                {a.source === "mcp" && <span className="text-stone-400"> (via Claude)</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
