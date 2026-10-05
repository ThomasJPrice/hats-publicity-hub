import { getQrOverview } from "@/lib/services/qr";
import { londonToday } from "@/lib/dates";

export const dynamic = "force-dynamic";

/** Quote a CSV cell, and defuse spreadsheet formulas in user-entered text. */
function cell(value: string | number | boolean | null): string {
  let s = value === null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET() {
  const { links } = await getQrOverview(14);
  const header = ["slug", "label", "placement", "short_url", "destination", "active", "total_scans", "scans_last_7_days", "last_scanned_at"];
  const rows = links.map((l) => [
    l.slug,
    l.label,
    l.placementType,
    l.shortUrl,
    l.destinationUrl,
    l.isActive,
    l.totalScans,
    l.last7Days,
    l.lastScannedAt?.toISOString() ?? null,
  ]);
  const csv = [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="qr-scans-${londonToday()}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
