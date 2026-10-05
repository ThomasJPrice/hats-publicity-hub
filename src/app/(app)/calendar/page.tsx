import Link from "next/link";
import { CHANNELS, POST_STATUSES, TASK_CATEGORIES, humanise } from "@/lib/constants";
import { addDays, eachDay, formatDay, londonToday, weekRange, type DateRange } from "@/lib/dates";
import { getCalendarItems, type CalendarFilters, type CalendarItem } from "@/lib/services/calendar";
import { oneOf, qs } from "@/components/ui";

type Params = { view?: string; date?: string; channel?: string; status?: string; category?: string };

const KIND_STYLE: Record<CalendarItem["kind"], string> = {
  key: "bg-amber-100 text-amber-900",
  performance: "bg-rose-600 text-white",
  post: "bg-sky-100 text-sky-900",
  task: "bg-emerald-100 text-emerald-900",
};

const KIND_LABEL: Record<CalendarItem["kind"], string> = {
  key: "Key date",
  performance: "Performance",
  post: "Post",
  task: "Task due",
};

function ItemChip({ item, compact }: { item: CalendarItem; compact?: boolean }) {
  const text = `${item.time && !compact ? item.time + " " : ""}${item.title}${item.meta === "proposed" ? " (proposed)" : ""}`;
  const cls = `block rounded px-1.5 py-0.5 ${KIND_STYLE[item.kind]} ${item.done ? "line-through opacity-60" : ""} ${
    compact ? "truncate text-[10px] leading-tight" : "text-sm"
  }`;
  return item.href ? (
    <Link href={item.href} className={cls} title={text}>
      {text}
    </Link>
  ) : (
    <span className={cls} title={text}>
      {text}
    </span>
  );
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const today = londonToday();
  const view = sp.view === "month" ? "month" : "week";
  const anchor = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : today;
  const filters: CalendarFilters = {
    channel: oneOf(sp.channel, CHANNELS),
    postStatus: oneOf(sp.status, POST_STATUSES),
    category: oneOf(sp.category, TASK_CATEGORIES),
  };
  const keep = { channel: filters.channel, status: filters.postStatus, category: filters.category };

  let range: DateRange;
  let title: string;
  let prev: string;
  let next: string;
  if (view === "week") {
    range = weekRange(anchor);
    title = `${formatDay(range.start, "d MMM")} to ${formatDay(range.end, "d MMM yyyy")}`;
    prev = addDays(range.start, -7);
    next = addDays(range.start, 7);
  } else {
    const first = `${anchor.slice(0, 7)}-01`;
    const last = addDays(`${addDays(first, 32).slice(0, 7)}-01`, -1);
    range = { start: weekRange(first).start, end: weekRange(last).end };
    title = formatDay(first, "MMMM yyyy");
    prev = `${addDays(first, -1).slice(0, 7)}-01`;
    next = `${addDays(first, 32).slice(0, 7)}-01`;
  }

  const items = await getCalendarItems(range, filters);
  const byDay = new Map<string, CalendarItem[]>();
  for (const i of items) byDay.set(i.date, [...(byDay.get(i.date) ?? []), i]);
  const days = eachDay(range.start, range.end);
  const link = (v: string, d: string) => `/calendar${qs({ view: v === "week" ? undefined : v, date: d === today ? undefined : d, ...keep })}`;

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Link href={link(view, prev)} className="btn btn-sm" aria-label="Previous">‹</Link>
          <Link href={link(view, today)} className="btn btn-sm">Today</Link>
          <Link href={link(view, next)} className="btn btn-sm" aria-label="Next">›</Link>
        </div>
        <div className="flex overflow-hidden rounded-lg border border-stone-300 text-xs">
          <Link href={link("week", anchor)} className={`px-3 py-1.5 ${view === "week" ? "bg-brand text-white" : "bg-white"}`}>Week</Link>
          <Link href={link("month", anchor)} className={`px-3 py-1.5 ${view === "month" ? "bg-brand text-white" : "bg-white"}`}>Month</Link>
        </div>
      </div>
      <h1 className="mt-3 text-lg font-semibold">{title}</h1>

      <form className="mt-2 grid grid-cols-3 gap-2" method="get">
        {view === "month" && <input type="hidden" name="view" value="month" />}
        <input type="hidden" name="date" value={anchor} />
        <select name="channel" aria-label="Channel" defaultValue={filters.channel ?? ""} className="input !px-2 !py-1.5">
          <option value="">Channel</option>
          {CHANNELS.map((c) => <option key={c} value={c}>{humanise(c)}</option>)}
        </select>
        <select name="status" aria-label="Post status" defaultValue={filters.postStatus ?? ""} className="input !px-2 !py-1.5">
          <option value="">Status</option>
          {POST_STATUSES.map((s) => <option key={s} value={s}>{humanise(s)}</option>)}
        </select>
        <select name="category" aria-label="Task category" defaultValue={filters.category ?? ""} className="input !px-2 !py-1.5">
          <option value="">Task type</option>
          {TASK_CATEGORIES.map((c) => <option key={c} value={c}>{humanise(c)}</option>)}
        </select>
        <button className="btn btn-sm col-span-3">Apply filters</button>
      </form>

      <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
        {(Object.keys(KIND_STYLE) as CalendarItem["kind"][]).map((k) => (
          <span key={k} className={`rounded px-1.5 py-0.5 ${KIND_STYLE[k]}`}>{KIND_LABEL[k]}</span>
        ))}
      </div>

      {view === "week" ? (
        <ul className="mt-3 space-y-2">
          {days.map((d) => {
            const list = byDay.get(d) ?? [];
            return (
              <li key={d} className={`card ${d === today ? "border-brand" : ""}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-semibold ${d === today ? "text-brand" : ""}`}>{formatDay(d, "EEE d MMM")}</span>
                  <Link href={`/posts/new${qs({ date: d })}`} className="btn btn-sm">+ Post</Link>
                </div>
                {list.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {list.map((i, idx) => <ItemChip key={idx} item={i} />)}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-3">
          <div className="grid grid-cols-7 gap-px text-center text-[11px] font-medium text-stone-500">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-stone-200 bg-stone-200">
            {days.map((d) => {
              const inMonth = d.slice(0, 7) === anchor.slice(0, 7);
              const list = byDay.get(d) ?? [];
              return (
                <div key={d} className={`min-h-20 bg-white p-0.5 ${inMonth ? "" : "bg-stone-50 opacity-60"}`}>
                  <Link
                    href={link("week", d)}
                    className={`mb-0.5 block text-right text-[11px] ${d === today ? "font-bold text-brand" : "text-stone-600"}`}
                  >
                    {Number(d.slice(8))}
                  </Link>
                  <div className="space-y-0.5">
                    {list.map((i, idx) => <ItemChip key={idx} item={i} compact />)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
