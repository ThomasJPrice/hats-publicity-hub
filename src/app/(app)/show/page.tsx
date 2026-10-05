import Link from "next/link";
import {
  saveKeyDateAction,
  savePerformanceAction,
  updateShowSettingsAction,
} from "@/app/actions";
import { ArchiveButton } from "@/components/archive-button";
import { Badge, Empty, ErrorNote } from "@/components/ui";
import { KEY_DATE_KINDS, humanise } from "@/lib/constants";
import { formatDay, formatInstant, londonInputValue } from "@/lib/dates";
import type { KeyDate, Performance } from "@/lib/db/schema";
import { getShowInfo } from "@/lib/services/show";

function KeyDateFields({ k }: { k?: KeyDate }) {
  return (
    <div className="space-y-2">
      {k && <input type="hidden" name="id" value={k.id} />}
      <div>
        <label className="label">Label</label>
        <input name="label" defaultValue={k?.label} required className="input" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Date</label>
          <input name="date" type="date" defaultValue={k?.date} required className="input" />
        </div>
        <div>
          <label className="label">End date (optional range)</label>
          <input name="endDate" type="date" defaultValue={k?.endDate ?? ""} className="input" />
        </div>
      </div>
      <div className="grid grid-cols-2 items-end gap-2">
        <div>
          <label className="label">Kind</label>
          <select name="kind" defaultValue={k?.kind ?? "other"} className="input">
            {KEY_DATE_KINDS.map((x) => <option key={x} value={x}>{humanise(x)}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" name="isProposed" defaultChecked={k?.isProposed} className="size-4" /> Proposed (unconfirmed)
        </label>
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea name="notes" defaultValue={k?.notes} rows={2} className="input" />
      </div>
    </div>
  );
}

function PerformanceFields({ p }: { p?: Performance }) {
  return (
    <div className="space-y-2">
      {p && <input type="hidden" name="id" value={p.id} />}
      <div>
        <label className="label">Date and time (London)</label>
        <input name="startsAt" type="datetime-local" defaultValue={p ? londonInputValue(p.startsAt) : ""} required className="input" />
      </div>
      <div>
        <label className="label">Label (optional)</label>
        <input name="label" defaultValue={p?.label ?? ""} className="input" />
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea name="notes" defaultValue={p?.notes} rows={2} className="input" />
      </div>
    </div>
  );
}

export default async function ShowPage({ searchParams }: { searchParams: Promise<{ error?: string; archived?: string }> }) {
  const sp = await searchParams;
  const showArchived = sp.archived === "1";
  const info = await getShowInfo(showArchived);
  const back = showArchived ? "/show?archived=1" : "/show";

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Show</h1>
        <Link href={showArchived ? "/show" : "/show?archived=1"} className="btn btn-sm">
          {showArchived ? "Hide archived" : "Show archived"}
        </Link>
      </div>
      <ErrorNote message={sp.error} />

      <h2 className="h2">Settings</h2>
      <form action={updateShowSettingsAction} className="card space-y-2">
        <div>
          <label className="label" htmlFor="name">Show name</label>
          <input id="name" name="name" defaultValue={info.settings.name} required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="utmCampaign">UTM campaign name</label>
          <input id="utmCampaign" name="utmCampaign" defaultValue={info.settings.utmCampaign} required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="defaultDestinationUrl">Default ticket destination (QR fallback and default for new links)</label>
          <input id="defaultDestinationUrl" name="defaultDestinationUrl" type="url" defaultValue={info.settings.defaultDestinationUrl} required className="input" />
        </div>
        <p className="text-xs text-stone-500">Changing the UTM campaign only affects links created afterwards.</p>
        <button className="btn btn-primary w-full">Save settings</button>
      </form>

      <h2 className="h2">Performances</h2>
      <p className="mb-2 text-xs text-stone-500">
        Opening night is the earliest non-archived performance
        {info.openingNight ? `: ${formatDay(info.openingNight, "EEEE d MMMM yyyy")}.` : "."} The countdown, Home and calendar all follow it.
      </p>
      {info.performances.length === 0 && <Empty>No performances.</Empty>}
      <ul className="space-y-2">
        {info.performances.map((p) => (
          <li key={p.id} className={`card ${p.archivedAt ? "opacity-60" : ""}`}>
            <details>
              <summary className="flex cursor-pointer items-center justify-between gap-2 text-sm">
                <span className="font-medium">
                  {formatInstant(p.startsAt, "EEE d MMM yyyy, HH:mm")}
                  {p.label ? ` · ${p.label}` : ""}
                </span>
                {p.archivedAt && <Badge className="bg-stone-200 text-stone-700">Archived</Badge>}
              </summary>
              <form action={savePerformanceAction} className="mt-3 space-y-2">
                <PerformanceFields p={p} />
                <button className="btn btn-primary btn-sm">Save</button>
              </form>
              <div className="mt-2">
                <ArchiveButton entity="performance" id={p.id} archived={!!p.archivedAt} back={back} />
              </div>
            </details>
          </li>
        ))}
      </ul>
      <details className="card mt-2">
        <summary className="cursor-pointer text-sm font-medium">+ Add performance</summary>
        <form action={savePerformanceAction} className="mt-3 space-y-2">
          <PerformanceFields />
          <button className="btn btn-primary btn-sm">Add</button>
        </form>
      </details>

      <h2 className="h2">Key dates</h2>
      {info.keyDates.length === 0 && <Empty>No key dates.</Empty>}
      <ul className="space-y-2">
        {info.keyDates.map((k) => (
          <li key={k.id} className={`card ${k.archivedAt ? "opacity-60" : ""}`}>
            <details>
              <summary className="cursor-pointer text-sm">
                <span className="font-medium">{k.label}</span>
                <span className="ml-2 inline-flex flex-wrap items-center gap-1.5 align-middle text-xs text-stone-500">
                  {formatDay(k.date, "EEE d MMM yyyy")}
                  {k.endDate ? ` to ${formatDay(k.endDate, "EEE d MMM")}` : ""}
                  <Badge>{humanise(k.kind)}</Badge>
                  {k.isProposed && <Badge className="bg-amber-100 text-amber-800">Proposed</Badge>}
                  {k.archivedAt && <Badge className="bg-stone-200 text-stone-700">Archived</Badge>}
                </span>
              </summary>
              <form action={saveKeyDateAction} className="mt-3 space-y-2">
                <KeyDateFields k={k} />
                <button className="btn btn-primary btn-sm">Save</button>
              </form>
              <div className="mt-2">
                <ArchiveButton entity="keyDate" id={k.id} archived={!!k.archivedAt} back={back} />
              </div>
            </details>
          </li>
        ))}
      </ul>
      <details className="card mt-2">
        <summary className="cursor-pointer text-sm font-medium">+ Add key date</summary>
        <form action={saveKeyDateAction} className="mt-3 space-y-2">
          <KeyDateFields />
          <button className="btn btn-primary btn-sm">Add</button>
        </form>
      </details>
    </div>
  );
}
