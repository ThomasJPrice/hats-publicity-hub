import { desc, eq, isNull, sql } from "drizzle-orm";
import type { DeviceClass, PlacementType, Source } from "@/lib/constants";
import { db } from "@/lib/db";
import { qrLinks, qrScans, type QrLink } from "@/lib/db/schema";
import { addDays, londonToday } from "@/lib/dates";
import { defaultUtm, shortUrl, slugify } from "@/lib/qr-url";
import type { QrCreate, QrUpdate } from "@/lib/schemas";
import { logActivity } from "./activity";
import { archivePatch, changeSummary } from "./archive";
import { getShowSettings } from "./show";

export async function findLinkBySlug(slug: string): Promise<QrLink | null> {
  const [row] = await db().select().from(qrLinks).where(eq(qrLinks.slug, slug)).limit(1);
  return row ?? null;
}

export async function getLink(id: string): Promise<QrLink | null> {
  const [row] = await db().select().from(qrLinks).where(eq(qrLinks.id, id)).limit(1);
  return row ?? null;
}

/** Stores a scan. Bots are stored but excluded from every count below. */
export async function recordScan(scan: { linkId: string; deviceClass: DeviceClass; isBot: boolean }) {
  await db().insert(qrScans).values(scan);
}

export async function createQrLink(input: QrCreate, source: Source): Promise<QrLink> {
  const slug = input.slug ?? slugify(input.label);
  if (slug.length < 2) throw new Error("Could not make a slug from that label; please supply one");
  if (await findLinkBySlug(slug)) throw new Error(`The slug "${slug}" is already in use`);
  const settings = await getShowSettings();
  const utm = defaultUtm(input.placementType, slug, settings.utmCampaign);
  const [row] = await db()
    .insert(qrLinks)
    .values({
      slug,
      label: input.label,
      placementType: input.placementType,
      destinationUrl: input.destinationUrl ?? settings.defaultDestinationUrl,
      utmSource: input.utmSource ?? utm.utmSource,
      utmMedium: input.utmMedium ?? utm.utmMedium,
      utmCampaign: input.utmCampaign ?? utm.utmCampaign,
      utmContent: input.utmContent ?? utm.utmContent,
      notes: input.notes ?? "",
    })
    .returning();
  await logActivity(source, "qr_link", row.id, `Created QR link ${shortUrl(row.slug)} (${row.label})`);
  return row;
}

/** The slug is never editable: it is what is printed. */
export async function updateQrLink(id: string, input: QrUpdate, source: Source): Promise<QrLink> {
  const existing = await getLink(id);
  if (!existing) throw new Error(`QR link ${id} not found`);
  const { archived, ...fields } = input;
  const [row] = await db()
    .update(qrLinks)
    .set({ ...fields, ...archivePatch(archived) })
    .where(eq(qrLinks.id, id))
    .returning();
  const repointed =
    input.destinationUrl && input.destinationUrl !== existing.destinationUrl
      ? `; destination ${existing.destinationUrl} -> ${input.destinationUrl}`
      : "";
  await logActivity(source, "qr_link", id, `${changeSummary("Updated", "QR link", row.slug, input)}${repointed}`);
  return row;
}

export type QrLinkStats = QrLink & {
  shortUrl: string;
  totalScans: number;
  periodScans: number;
  last7Days: number;
  lastScannedAt: Date | null;
  /** One entry per London day in the period, oldest first. */
  daily: { date: string; count: number }[];
};

export type QrOverview = {
  days: number;
  links: QrLinkStats[];
  byPlacement: { placementType: PlacementType; links: number; totalScans: number; periodScans: number }[];
};

const num = (v: unknown) => Number(v ?? 0);

/** Scan stats per link over the last `days` London days (including today). Bots excluded. */
export async function getQrOverview(days = 14, today = londonToday(), includeArchived = false): Promise<QrOverview> {
  const periodStart = addDays(today, -(days - 1));
  const last7Start = addDays(today, -6);
  const day = sql<string>`to_char(${qrScans.scannedAt} at time zone 'Europe/London', 'YYYY-MM-DD')`;

  const [links, totals, dailyRows] = await Promise.all([
    db()
      .select()
      .from(qrLinks)
      .where(includeArchived ? undefined : isNull(qrLinks.archivedAt))
      .orderBy(desc(qrLinks.createdAt)),
    db()
      .select({
        linkId: qrScans.linkId,
        total: sql<number>`count(*)`,
        period: sql<number>`count(*) filter (where ${day} >= ${periodStart})`,
        last7: sql<number>`count(*) filter (where ${day} >= ${last7Start})`,
        last: sql<Date | null>`max(${qrScans.scannedAt})`,
      })
      .from(qrScans)
      .where(eq(qrScans.isBot, false))
      .groupBy(qrScans.linkId),
    db()
      .select({ linkId: qrScans.linkId, day, count: sql<number>`count(*)` })
      .from(qrScans)
      .where(sql`${qrScans.isBot} = false and ${day} >= ${periodStart}`)
      .groupBy(qrScans.linkId, day),
  ]);

  const totalsById = new Map(totals.map((t) => [t.linkId, t]));
  const dailyById = new Map<string, Map<string, number>>();
  for (const r of dailyRows) {
    const m = dailyById.get(r.linkId) ?? new Map<string, number>();
    m.set(r.day, num(r.count));
    dailyById.set(r.linkId, m);
  }

  const stats: QrLinkStats[] = links.map((l) => {
    const t = totalsById.get(l.id);
    const d = dailyById.get(l.id);
    return {
      ...l,
      shortUrl: shortUrl(l.slug),
      totalScans: num(t?.total),
      periodScans: num(t?.period),
      last7Days: num(t?.last7),
      lastScannedAt: t?.last ? new Date(t.last) : null,
      daily: Array.from({ length: days }, (_, i) => {
        const date = addDays(periodStart, i);
        return { date, count: d?.get(date) ?? 0 };
      }),
    };
  });

  const byType = new Map<PlacementType, QrOverview["byPlacement"][number]>();
  for (const s of stats) {
    const e = byType.get(s.placementType) ?? { placementType: s.placementType, links: 0, totalScans: 0, periodScans: 0 };
    e.links += 1;
    e.totalScans += s.totalScans;
    e.periodScans += s.periodScans;
    byType.set(s.placementType, e);
  }

  return { days, links: stats, byPlacement: [...byType.values()].sort((a, b) => b.totalScans - a.totalScans) };
}
