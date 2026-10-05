import { and, asc, eq, isNull, type SQL } from "drizzle-orm";
import type { Source } from "@/lib/constants";
import { db } from "@/lib/db";
import {
  keyDates,
  performances,
  showSettings,
  type KeyDate,
  type Performance,
  type ShowSettings,
} from "@/lib/db/schema";
import { londonDateOf, londonTimeOf } from "@/lib/dates";
import type {
  KeyDateCreate,
  KeyDateUpdate,
  PerformanceCreate,
  PerformanceUpdate,
  ShowSettingsInput,
} from "@/lib/schemas";
import { envDefaultDestinationUrl } from "@/lib/qr-url";
import { openingNightOf } from "@/lib/show";
import { logActivity } from "./activity";
import { archivePatch, changeSummary } from "./archive";

export const DEFAULT_SHOW_NAME = "HATS Panto 2027: The Wizard of Oz";
export const DEFAULT_UTM_CAMPAIGN = "wizard-of-oz-2027";

/** The single settings row. If the seed hasn't run yet, sensible defaults are returned (and persisted on first edit). */
export async function getShowSettings(): Promise<Pick<ShowSettings, "name" | "utmCampaign" | "defaultDestinationUrl"> & { id: string | null }> {
  const [row] = await db().select().from(showSettings).limit(1);
  return (
    row ?? {
      id: null,
      name: DEFAULT_SHOW_NAME,
      utmCampaign: DEFAULT_UTM_CAMPAIGN,
      defaultDestinationUrl: envDefaultDestinationUrl(),
    }
  );
}

export async function updateShowSettings(input: Partial<ShowSettingsInput>, source: Source): Promise<ShowSettings> {
  const [existing] = await db().select().from(showSettings).limit(1);
  let row: ShowSettings;
  if (existing) {
    [row] = await db().update(showSettings).set(input).where(eq(showSettings.id, existing.id)).returning();
  } else {
    const defaults = await getShowSettings();
    [row] = await db()
      .insert(showSettings)
      .values({
        name: input.name ?? defaults.name,
        utmCampaign: input.utmCampaign ?? defaults.utmCampaign,
        defaultDestinationUrl: input.defaultDestinationUrl ?? defaults.defaultDestinationUrl,
      })
      .returning();
  }
  await logActivity(source, "show_settings", row.id, `Updated show settings (${Object.keys(input).join(", ")})`);
  return row;
}

// ---------- key dates ----------

export async function listKeyDates(includeArchived = false): Promise<KeyDate[]> {
  const where: SQL[] = includeArchived ? [] : [isNull(keyDates.archivedAt)];
  return db()
    .select()
    .from(keyDates)
    .where(and(...where))
    .orderBy(asc(keyDates.date), asc(keyDates.label));
}

export async function getKeyDate(id: string): Promise<KeyDate | null> {
  const [row] = await db().select().from(keyDates).where(eq(keyDates.id, id));
  return row ?? null;
}

function assertRange(date: string, endDate: string | null | undefined) {
  if (endDate && endDate < date) throw new Error("End date can't be before the start date");
}

export async function createKeyDate(input: KeyDateCreate, source: Source): Promise<KeyDate> {
  assertRange(input.date, input.endDate);
  const [row] = await db()
    .insert(keyDates)
    .values({
      label: input.label,
      date: input.date,
      endDate: input.endDate ?? null,
      kind: input.kind ?? "other",
      isProposed: input.isProposed ?? false,
      notes: input.notes ?? "",
    })
    .returning();
  await logActivity(source, "key_date", row.id, `Created key date: ${row.label} (${row.date})`);
  return row;
}

export async function updateKeyDate(id: string, input: KeyDateUpdate, source: Source): Promise<KeyDate> {
  const existing = await getKeyDate(id);
  if (!existing) throw new Error(`Key date ${id} not found`);
  const { archived, ...fields } = input;
  assertRange(fields.date ?? existing.date, fields.endDate === undefined ? existing.endDate : fields.endDate);
  const [row] = await db()
    .update(keyDates)
    .set({ ...fields, ...archivePatch(archived) })
    .where(eq(keyDates.id, id))
    .returning();
  await logActivity(source, "key_date", id, changeSummary("Updated", "key date", row.label, input));
  return row;
}

// ---------- performances ----------

export async function listPerformances(includeArchived = false): Promise<Performance[]> {
  const where: SQL[] = includeArchived ? [] : [isNull(performances.archivedAt)];
  return db()
    .select()
    .from(performances)
    .where(and(...where))
    .orderBy(asc(performances.startsAt));
}

export async function getPerformance(id: string): Promise<Performance | null> {
  const [row] = await db().select().from(performances).where(eq(performances.id, id));
  return row ?? null;
}

function describePerformance(p: Pick<Performance, "startsAt">): string {
  return `${londonDateOf(p.startsAt)} ${londonTimeOf(p.startsAt)}`;
}

export async function createPerformance(input: PerformanceCreate, source: Source): Promise<Performance> {
  const [row] = await db()
    .insert(performances)
    .values({ startsAt: new Date(input.startsAt), label: input.label ?? null, notes: input.notes ?? "" })
    .returning();
  await logActivity(source, "performance", row.id, `Created performance: ${describePerformance(row)}`);
  return row;
}

export async function updatePerformance(id: string, input: PerformanceUpdate, source: Source): Promise<Performance> {
  const { archived, startsAt, ...fields } = input;
  const [row] = await db()
    .update(performances)
    .set({ ...fields, ...(startsAt ? { startsAt: new Date(startsAt) } : {}), ...archivePatch(archived) })
    .where(eq(performances.id, id))
    .returning();
  if (!row) throw new Error(`Performance ${id} not found`);
  await logActivity(source, "performance", id, changeSummary("Updated", "performance", describePerformance(row), input));
  return row;
}

// ---------- combined ----------

/** Everything about the show, from the database. Opening night is derived from non-archived performances. */
export async function getShowInfo(includeArchived = false) {
  const [settings, dates, perfs, activePerfs] = await Promise.all([
    getShowSettings(),
    listKeyDates(includeArchived),
    listPerformances(includeArchived),
    includeArchived ? listPerformances(false) : null,
  ]);
  return {
    settings,
    openingNight: openingNightOf(activePerfs ?? perfs),
    keyDates: dates,
    performances: perfs,
    note: "Dates marked is_proposed are unconfirmed.",
  };
}
