import Link from "next/link";
import { createQrAction, updateQrAction } from "@/app/actions";
import { ArchiveButton } from "@/components/archive-button";
import { PLACEMENT_TYPES, humanise } from "@/lib/constants";
import { formatDay, formatInstant } from "@/lib/dates";
import { getQrOverview, type QrLinkStats } from "@/lib/services/qr";
import { getShowSettings } from "@/lib/services/show";
import { Badge, Empty, ErrorNote } from "@/components/ui";
import { SlugField } from "@/components/slug-field";

function DailyChart({ daily }: { daily: QrLinkStats["daily"] }) {
  const max = Math.max(1, ...daily.map((d) => d.count));
  return (
    <div className="flex h-10 items-end gap-0.5" role="img" aria-label={`Scans per day, last ${daily.length} days`}>
      {daily.map((d) => (
        <div
          key={d.date}
          title={`${formatDay(d.date)}: ${d.count}`}
          className={`flex-1 rounded-sm ${d.count ? "bg-brand" : "bg-stone-200"}`}
          style={{ height: `${d.count ? Math.max(12, (d.count / max) * 100) : 6}%` }}
        />
      ))}
    </div>
  );
}

function LinkCard({ link, back }: { link: QrLinkStats; back: string }) {
  const base = `/api/qr/${link.slug}`;
  const archived = link.archivedAt !== null;
  return (
    <li className={`card ${archived ? "opacity-70" : ""}`}>
      <div className="flex gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${base}?format=svg`} alt={`QR code for ${link.label}`} width={96} height={96} className="size-24 shrink-0 rounded border border-stone-200" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-medium">{link.label}</span>
            {!link.isActive && <Badge className="bg-red-100 text-red-800">Inactive</Badge>}
            {archived && <Badge className="bg-stone-200 text-stone-700">Archived</Badge>}
          </div>
          <p className="text-xs text-stone-500">{humanise(link.placementType)}</p>
          <p className="mt-1 break-all font-mono text-xs">{link.shortUrl}</p>
          <div className="mt-2 flex gap-2">
            <a href={`${base}?format=svg&download=1`} className="btn btn-sm">SVG</a>
            <a href={`${base}?format=png&download=1`} className="btn btn-sm">PNG</a>
          </div>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div><dt className="text-[11px] text-stone-500">Total</dt><dd className="text-lg font-semibold">{link.totalScans}</dd></div>
        <div><dt className="text-[11px] text-stone-500">Last 7 days</dt><dd className="text-lg font-semibold">{link.last7Days}</dd></div>
        <div>
          <dt className="text-[11px] text-stone-500">Last scanned</dt>
          <dd className="text-xs font-medium leading-7">{link.lastScannedAt ? formatInstant(link.lastScannedAt, "d MMM HH:mm") : "never"}</dd>
        </div>
      </dl>
      <div className="mt-2">
        <DailyChart daily={link.daily} />
        <p className="mt-0.5 text-[10px] text-stone-400">Last {link.daily.length} days</p>
      </div>

      <details className="mt-2">
        <summary className="cursor-pointer text-xs text-stone-600">Edit link</summary>
        <form action={updateQrAction} className="mt-2 space-y-2">
          <input type="hidden" name="id" value={link.id} />
          <div>
            <label className="label">Slug (read-only: it is printed on posters)</label>
            <input value={link.slug} readOnly disabled className="input bg-stone-100 font-mono" />
          </div>
          <div>
            <label className="label">Label</label>
            <input name="label" defaultValue={link.label} required className="input" />
          </div>
          <div>
            <label className="label">Placement</label>
            <select name="placementType" defaultValue={link.placementType} className="input">
              {PLACEMENT_TYPES.map((p) => <option key={p} value={p}>{humanise(p)}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Destination (changing this repoints every printed code)</label>
            <input name="destinationUrl" type="url" defaultValue={link.destinationUrl} required className="input" />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea name="notes" defaultValue={link.notes} rows={2} className="input" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isActive" defaultChecked={link.isActive} className="size-4" /> Active
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">utm_source</label>
              <input name="utmSource" defaultValue={link.utmSource} className="input" />
            </div>
            <div>
              <label className="label">utm_medium</label>
              <input name="utmMedium" defaultValue={link.utmMedium} className="input" />
            </div>
            <div>
              <label className="label">utm_campaign</label>
              <input name="utmCampaign" defaultValue={link.utmCampaign} className="input" />
            </div>
            <div>
              <label className="label">utm_content</label>
              <input name="utmContent" defaultValue={link.utmContent} className="input" />
            </div>
          </div>
          <button className="btn btn-primary btn-sm">Save</button>
        </form>
        <div className="mt-2">
          <ArchiveButton entity="qr" id={link.id} archived={archived} back={back} />
          {!archived && <p className="mt-1 text-[11px] text-stone-500">Archived links stop redirecting and send visitors to the default ticket page.</p>}
        </div>
      </details>
    </li>
  );
}

export default async function QrPage({ searchParams }: { searchParams: Promise<{ error?: string; archived?: string }> }) {
  const { error, archived } = await searchParams;
  const showArchived = archived === "1";
  const back = showArchived ? "/qr?archived=1" : "/qr";
  const [overview, settings] = await Promise.all([getQrOverview(14, undefined, showArchived), getShowSettings()]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">QR tracking</h1>
        <div className="flex gap-2">
          <Link href={showArchived ? "/qr" : "/qr?archived=1"} className="btn btn-sm">{showArchived ? "Hide archived" : "Show archived"}</Link>
          <a href="/api/qr-export" className="btn btn-sm">Export CSV</a>
        </div>
      </div>
      <ErrorNote message={error} />

      <section className="card mt-3 text-xs text-stone-600">
        <p className="font-medium text-stone-800">Printing tips</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          <li>Print at least 2 cm square, and larger on banners (roughly 1 cm of code per 10 cm of scanning distance).</li>
          <li>Test with a phone before sending anything to print.</li>
          <li>Do not print the short URL under the code. Print a direct address for people who won&apos;t scan instead (the HATS website or the TicketSource page); visits from it are untracked.</li>
          <li>A scan is not a sale. Bot scans are stored but never counted.</li>
        </ul>
      </section>

      <h2 className="h2">New link</h2>
      <form action={createQrAction} className="card space-y-2">
        <div>
          <label className="label" htmlFor="label">Label</label>
          <input id="label" name="label" required placeholder="A3 poster, Co-op noticeboard" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="placementType">Placement</label>
          <select id="placementType" name="placementType" defaultValue="poster_a3" className="input">
            {PLACEMENT_TYPES.map((p) => <option key={p} value={p}>{humanise(p)}</option>)}
          </select>
        </div>
        <SlugField />
        <div>
          <label className="label" htmlFor="destinationUrl">Destination</label>
          <input id="destinationUrl" name="destinationUrl" type="url" defaultValue={settings.defaultDestinationUrl} className="input" />
        </div>
        <button className="btn btn-primary w-full">Create link</button>
      </form>

      <h2 className="h2">Scans by placement (last 14 days / all time)</h2>
      {overview.byPlacement.length === 0 ? (
        <Empty>No links yet.</Empty>
      ) : (
        <div className="card overflow-hidden !p-0">
          <table className="w-full text-sm">
            <tbody>
              {overview.byPlacement.map((p) => (
                <tr key={p.placementType} className="border-b border-stone-100 last:border-0">
                  <td className="px-3 py-2">{humanise(p.placementType)} <span className="text-xs text-stone-400">({p.links})</span></td>
                  <td className="px-3 py-2 text-right tabular-nums">{p.periodScans} / {p.totalScans}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="h2">Links</h2>
      <ul className="space-y-3">
        {overview.links.map((l) => <LinkCard key={l.id} link={l} back={back} />)}
      </ul>
    </div>
  );
}
