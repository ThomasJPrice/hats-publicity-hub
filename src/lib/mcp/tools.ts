import type { McpServer } from "@modelcontextprotocol/server";
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
import { londonDayStart } from "@/lib/dates";
import { httpsUrl, slugSchema } from "@/lib/schemas";
import { showInfo } from "@/lib/show";
import { listActivity, logActivity } from "@/lib/services/activity";
import { createPost, listPosts, updatePost } from "@/lib/services/posts";
import { createQrLink, findLinkBySlug, getLink, getQrOverview, updateQrLink } from "@/lib/services/qr";
import { getStatusSummary } from "@/lib/services/summary";
import { completeTask, createTask, listTasks, updateTask } from "@/lib/services/tasks";
import { shortUrl } from "@/lib/qr-url";

const WEEKS = "Weeks run Monday to Sunday in London time (Europe/London). Dates are ISO 8601 (yyyy-MM-dd).";
const ymd = z.iso.date();
const instant = z.iso.datetime({ offset: true });

type Result = { content: { type: "text"; text: string }[]; isError?: boolean };

async function run(fn: () => Promise<unknown>): Promise<Result> {
  try {
    const value = await fn();
    return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] };
  } catch (err) {
    return { content: [{ type: "text", text: err instanceof Error ? err.message : String(err) }], isError: true };
  }
}

/** Every MCP tool is a thin wrapper: validate (zod) then call a service. No deletes, nothing is published or sent. */
export function registerTools(server: McpServer) {
  server.registerTool(
    "get_status_summary",
    {
      title: "Status summary",
      description: `Overdue tasks, tasks due this week and next week, posts this week, next key dates, days to opening night, and top QR links by scans in the last 7 days. "Due this week" means from today to Sunday. ${WEEKS}`,
      inputSchema: z.object({}),
    },
    () => run(() => getStatusSummary()),
  );

  server.registerTool(
    "get_show_info",
    {
      title: "Show info",
      description: "Key dates (some proposed/unconfirmed) and performances for HATS Panto 2027, The Wizard of Oz.",
      inputSchema: z.object({}),
    },
    () => run(async () => showInfo()),
  );

  server.registerTool(
    "list_tasks",
    {
      title: "List tasks",
      description: `List tasks, soonest due first. Archived tasks are excluded. status "open" means anything not done. overdue = open and due before today. this_week / next_week = due any day Monday to Sunday of that week. ${WEEKS}`,
      inputSchema: z.object({
        status: z.enum([...TASK_STATUSES, "open"]).optional(),
        category: z.enum(TASK_CATEGORIES).optional(),
        due_before: ymd.optional().describe("Due strictly before this date"),
        due_after: ymd.optional().describe("Due on or after this date"),
        overdue: z.boolean().optional(),
        this_week: z.boolean().optional(),
        next_week: z.boolean().optional(),
      }),
    },
    (a) =>
      run(() =>
        listTasks({
          status: a.status,
          category: a.category,
          dueBefore: a.due_before,
          dueAfter: a.due_after,
          overdue: a.overdue,
          thisWeek: a.this_week,
          nextWeek: a.next_week,
        }),
      ),
  );

  server.registerTool(
    "create_task",
    {
      title: "Create task",
      description: "Add a publicity task.",
      inputSchema: z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        category: z.enum(TASK_CATEGORIES),
        due_date: ymd.optional(),
        priority: z.enum(TASK_PRIORITIES).optional(),
      }),
    },
    (a) =>
      run(() =>
        createTask(
          { title: a.title, description: a.description, category: a.category, dueDate: a.due_date, priority: a.priority },
          "mcp",
        ),
      ),
  );

  server.registerTool(
    "update_task",
    {
      title: "Update task",
      description: "Change any editable field of a task, including status and notes. To mark done, prefer complete_task.",
      inputSchema: z.object({
        id: z.uuid(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        category: z.enum(TASK_CATEGORIES).optional(),
        due_date: ymd.nullable().optional(),
        status: z.enum(TASK_STATUSES).optional(),
        priority: z.enum(TASK_PRIORITIES).optional(),
        notes: z.string().optional(),
      }),
    },
    ({ id, due_date, ...rest }) =>
      run(() => updateTask(id, { ...rest, ...(due_date !== undefined ? { dueDate: due_date } : {}) }, "mcp")),
  );

  server.registerTool(
    "complete_task",
    {
      title: "Complete task",
      description: "Mark a task done, optionally appending a note.",
      inputSchema: z.object({ id: z.uuid(), note: z.string().optional() }),
    },
    ({ id, note }) => run(() => completeTask(id, "mcp", note)),
  );

  server.registerTool(
    "list_posts",
    {
      title: "List posts",
      description: `List planned social/email posts by scheduled time. "Scheduled" means scheduled in Meta Business Suite; this app never publishes. from/to are inclusive London dates. ${WEEKS}`,
      inputSchema: z.object({
        from: ymd.optional(),
        to: ymd.optional(),
        status: z.enum(POST_STATUSES).optional(),
        channel: z.enum(CHANNELS).optional(),
      }),
    },
    (a) => run(() => listPosts(a)),
  );

  const postFields = {
    scheduled_for: instant
      .optional()
      .describe("ISO 8601 with offset, e.g. 2026-10-12T09:00:00+01:00 (London is +01:00 in summer, +00:00 in winter)"),
    channels: z.array(z.enum(CHANNELS)).optional(),
    pillar: z.enum(PILLARS).optional(),
    caption: z.string().optional(),
    visual_brief: z.string().optional(),
    status: z.enum(POST_STATUSES).optional(),
  };

  server.registerTool(
    "create_post",
    {
      title: "Create post",
      description: "Plan a post. This records the plan only; nothing is published.",
      inputSchema: z.object({ title: z.string().min(1), ...postFields }),
    },
    (a) =>
      run(() =>
        createPost(
          {
            title: a.title,
            scheduledFor: a.scheduled_for,
            channels: a.channels,
            pillar: a.pillar,
            caption: a.caption,
            visualBrief: a.visual_brief,
            status: a.status,
          },
          "mcp",
        ),
      ),
  );

  server.registerTool(
    "update_post",
    {
      title: "Update post",
      description: "Change any editable field of a post. Set scheduled_for to null to unschedule.",
      inputSchema: z.object({
        id: z.uuid(),
        title: z.string().min(1).optional(),
        ...postFields,
        scheduled_for: instant.nullable().optional(),
        asset_link: z.string().optional(),
        notes: z.string().optional(),
      }),
    },
    ({ id, scheduled_for, visual_brief, asset_link, ...rest }) =>
      run(() =>
        updatePost(
          id,
          {
            ...rest,
            ...(scheduled_for !== undefined ? { scheduledFor: scheduled_for } : {}),
            ...(visual_brief !== undefined ? { visualBrief: visual_brief } : {}),
            ...(asset_link !== undefined ? { assetLink: asset_link } : {}),
          },
          "mcp",
        ),
      ),
  );

  server.registerTool(
    "list_qr_links",
    {
      title: "List QR links",
      description: "All tracked QR short links with scan totals (all time and last 7 days). Bot scans are excluded.",
      inputSchema: z.object({}),
    },
    () =>
      run(async () => {
        const { links, byPlacement } = await getQrOverview(7);
        return {
          links: links.map((l) => ({ ...l, daily: undefined })),
          byPlacement,
        };
      }),
  );

  server.registerTool(
    "create_qr_link",
    {
      title: "Create QR link",
      description:
        "Create a tracked short link for a print placement. Slug defaults to one made from the label; destination defaults to the main ticket page. Returns the short URL to encode in the QR code.",
      inputSchema: z.object({
        label: z.string().min(1),
        placement_type: z.enum(PLACEMENT_TYPES),
        slug: slugSchema.optional(),
        destination_url: httpsUrl.optional(),
      }),
    },
    (a) =>
      run(async () => {
        const link = await createQrLink(
          { label: a.label, placementType: a.placement_type, slug: a.slug, destinationUrl: a.destination_url },
          "mcp",
        );
        return { ...link, shortUrl: shortUrl(link.slug) };
      }),
  );

  server.registerTool(
    "update_qr_link",
    {
      title: "Update QR link",
      description:
        "Edit a QR link by id or slug (label, active flag, notes, UTM values, destination). The slug cannot change because it is printed. Changing destination_url repoints every printed code, so it requires confirm: true.",
      inputSchema: z.object({
        id: z.uuid().optional(),
        slug: z.string().optional(),
        label: z.string().min(1).optional(),
        is_active: z.boolean().optional(),
        notes: z.string().optional(),
        destination_url: httpsUrl.optional(),
        confirm: z.boolean().optional().describe("Must be true to change destination_url"),
      }),
    },
    (a) =>
      run(async () => {
        const link = a.id ? await getLink(a.id) : a.slug ? await findLinkBySlug(a.slug) : null;
        if (!link) throw new Error("Provide the id or slug of an existing QR link");
        if (a.destination_url && a.destination_url !== link.destinationUrl && a.confirm !== true) {
          throw new Error(
            `Refusing to repoint ${link.slug} from ${link.destinationUrl} to ${a.destination_url} without confirm: true`,
          );
        }
        return updateQrLink(
          link.id,
          { label: a.label, isActive: a.is_active, notes: a.notes, destinationUrl: a.destination_url },
          "mcp",
        );
      }),
  );

  server.registerTool(
    "get_qr_stats",
    {
      title: "QR scan stats",
      description: `Scan counts per QR link over the last \`days\` days (default 7, including today), plus totals by placement type. Bot scans are excluded. Optionally narrow to one link by slug. ${WEEKS}`,
      inputSchema: z.object({ slug: z.string().optional(), days: z.number().int().min(1).max(365).optional() }),
    },
    (a) =>
      run(async () => {
        const overview = await getQrOverview(a.days ?? 7);
        if (!a.slug) return overview;
        const link = overview.links.find((l) => l.slug === a.slug);
        if (!link) throw new Error(`No QR link with slug "${a.slug}"`);
        return { days: overview.days, link };
      }),
  );

  server.registerTool(
    "log_activity",
    {
      title: "Log activity",
      description: 'Record a free-text note in the activity log, e.g. "collected the A3 posters".',
      inputSchema: z.object({ note: z.string().min(1).max(1000) }),
    },
    ({ note }) =>
      run(async () => {
        await logActivity("mcp", "note", null, note);
        return { logged: note };
      }),
  );

  server.registerTool(
    "list_activity",
    {
      title: "List activity",
      description: `Activity log, newest first, optionally since a London date (inclusive). Useful for "what have I done this week?". ${WEEKS}`,
      inputSchema: z.object({ since: ymd.optional(), limit: z.number().int().min(1).max(200).optional() }),
    },
    (a) => run(() => listActivity(a.since ? londonDayStart(a.since) : undefined, a.limit ?? 50)),
  );

}
