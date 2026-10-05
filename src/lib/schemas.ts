import { z } from "zod";
import {
  CHANNELS,
  PILLARS,
  PLACEMENT_TYPES,
  POST_STATUSES,
  TASK_CATEGORIES,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from "@/lib/constants";

const ymd = z.iso.date();
const text = (max = 5000) => z.string().trim().max(max);

export const httpsUrl = z
  .url()
  .refine((u) => u.startsWith("https://"), "Must be an https:// URL");

export const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(60)
  .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and hyphens only");

const taskFields = {
  title: text(300).min(1),
  description: text(),
  category: z.enum(TASK_CATEGORIES),
  dueDate: ymd.nullable(),
  status: z.enum(TASK_STATUSES),
  priority: z.enum(TASK_PRIORITIES),
  notes: text(),
};

export const taskCreateSchema = z.object({
  title: taskFields.title,
  category: taskFields.category,
  description: taskFields.description.optional(),
  dueDate: taskFields.dueDate.optional(),
  priority: taskFields.priority.optional(),
  status: taskFields.status.optional(),
  notes: taskFields.notes.optional(),
});
export const taskUpdateSchema = z.object(taskFields).partial();

export type TaskCreate = z.infer<typeof taskCreateSchema>;
export type TaskUpdate = z.infer<typeof taskUpdateSchema>;

const postFields = {
  title: text(300).min(1),
  scheduledFor: z.iso.datetime({ offset: true }).nullable(),
  channels: z.array(z.enum(CHANNELS)),
  pillar: z.enum(PILLARS),
  caption: text(10000),
  visualBrief: text(),
  assetLink: text(1000),
  status: z.enum(POST_STATUSES),
  notes: text(),
};

export const postCreateSchema = z.object({
  title: postFields.title,
  scheduledFor: postFields.scheduledFor.optional(),
  channels: postFields.channels.optional(),
  pillar: postFields.pillar.optional(),
  caption: postFields.caption.optional(),
  visualBrief: postFields.visualBrief.optional(),
  assetLink: postFields.assetLink.optional(),
  status: postFields.status.optional(),
  notes: postFields.notes.optional(),
});
export const postUpdateSchema = z.object(postFields).partial();

export type PostCreate = z.infer<typeof postCreateSchema>;
export type PostUpdate = z.infer<typeof postUpdateSchema>;

const utm = z.string().trim().max(100);

export const qrCreateSchema = z.object({
  label: text(200).min(1),
  placementType: z.enum(PLACEMENT_TYPES),
  slug: slugSchema.optional(),
  destinationUrl: httpsUrl.optional(),
  utmSource: utm.optional(),
  utmMedium: utm.optional(),
  utmCampaign: utm.optional(),
  utmContent: utm.optional(),
  notes: text().optional(),
});

export const qrUpdateSchema = z
  .object({
    label: text(200).min(1),
    placementType: z.enum(PLACEMENT_TYPES),
    destinationUrl: httpsUrl,
    utmSource: utm,
    utmMedium: utm,
    utmCampaign: utm,
    utmContent: utm,
    isActive: z.boolean(),
    notes: text(),
  })
  .partial();

export type QrCreate = z.infer<typeof qrCreateSchema>;
export type QrUpdate = z.infer<typeof qrUpdateSchema>;
