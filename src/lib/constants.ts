export const TASK_CATEGORIES = ["social", "content", "print", "press", "email", "ticketing", "admin"] as const;
export const TASK_STATUSES = ["todo", "doing", "done", "blocked"] as const;
export const TASK_PRIORITIES = ["low", "normal", "high"] as const;
export const CHANNELS = ["facebook", "instagram", "tiktok", "nextdoor", "email"] as const;
export const PILLARS = ["cast", "behind_the_scenes", "oz_fun", "practical", "social_proof"] as const;
export const POST_STATUSES = ["idea", "drafted", "scheduled", "posted"] as const;
export const PLACEMENT_TYPES = [
  "poster_a3",
  "poster_a4",
  "leaflet_a6",
  "banner",
  "programme",
  "press",
  "noticeboard",
  "other",
] as const;
export const KEY_DATE_KINDS = ["milestone", "audition", "rehearsal", "tech", "sales", "other"] as const;
export const DEVICE_CLASSES = ["mobile", "tablet", "desktop", "unknown"] as const;
export const SOURCES = ["web", "mcp"] as const;

export type TaskCategory = (typeof TASK_CATEGORIES)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export type Channel = (typeof CHANNELS)[number];
export type Pillar = (typeof PILLARS)[number];
export type PostStatus = (typeof POST_STATUSES)[number];
export type PlacementType = (typeof PLACEMENT_TYPES)[number];
export type KeyDateKind = (typeof KEY_DATE_KINDS)[number];
export type DeviceClass = (typeof DEVICE_CLASSES)[number];
export type Source = (typeof SOURCES)[number];

/** "poster_a3" -> "Poster a3" */
export function humanise(value: string): string {
  const s = value.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}
