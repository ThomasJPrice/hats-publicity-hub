import { sql } from "drizzle-orm";
import { boolean, date, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type {
  Channel,
  DeviceClass,
  PlacementType,
  Pillar,
  PostStatus,
  Source,
  TaskCategory,
  TaskPriority,
  TaskStatus,
} from "@/lib/constants";

const tz = (name: string) => timestamp(name, { withTimezone: true });
const stamps = {
  createdAt: tz("created_at").notNull().defaultNow(),
  updatedAt: tz("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    category: text("category").$type<TaskCategory>().notNull(),
    dueDate: date("due_date"),
    status: text("status").$type<TaskStatus>().notNull().default("todo"),
    priority: text("priority").$type<TaskPriority>().notNull().default("normal"),
    notes: text("notes").notNull().default(""),
    completedAt: tz("completed_at"),
    archivedAt: tz("archived_at"),
    ...stamps,
  },
  (t) => [index("tasks_due_idx").on(t.dueDate)],
);

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    scheduledFor: tz("scheduled_for"),
    channels: text("channels")
      .array()
      .$type<Channel[]>()
      .notNull()
      .default(sql`'{}'::text[]`),
    pillar: text("pillar").$type<Pillar>().notNull().default("practical"),
    caption: text("caption").notNull().default(""),
    visualBrief: text("visual_brief").notNull().default(""),
    assetLink: text("asset_link").notNull().default(""),
    status: text("status").$type<PostStatus>().notNull().default("idea"),
    notes: text("notes").notNull().default(""),
    archivedAt: tz("archived_at"),
    ...stamps,
  },
  (t) => [index("posts_scheduled_idx").on(t.scheduledFor)],
);

export const qrLinks = pgTable("qr_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  label: text("label").notNull(),
  placementType: text("placement_type").$type<PlacementType>().notNull(),
  destinationUrl: text("destination_url").notNull(),
  utmSource: text("utm_source").notNull().default(""),
  utmMedium: text("utm_medium").notNull().default(""),
  utmCampaign: text("utm_campaign").notNull().default(""),
  utmContent: text("utm_content").notNull().default(""),
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes").notNull().default(""),
  ...stamps,
});

/** Deliberately minimal: no IP, no user agent, no cookies. */
export const qrScans = pgTable(
  "qr_scans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    linkId: uuid("link_id")
      .notNull()
      .references(() => qrLinks.id),
    scannedAt: tz("scanned_at").notNull().defaultNow(),
    deviceClass: text("device_class").$type<DeviceClass>().notNull().default("unknown"),
    isBot: boolean("is_bot").notNull().default(false),
  },
  (t) => [index("qr_scans_link_idx").on(t.linkId, t.scannedAt)],
);

export const activityLog = pgTable("activity_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  at: tz("at").notNull().defaultNow(),
  source: text("source").$type<Source>().notNull(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id"),
  summary: text("summary").notNull(),
});

export type Task = typeof tasks.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type QrLink = typeof qrLinks.$inferSelect;
export type ActivityEntry = typeof activityLog.$inferSelect;
