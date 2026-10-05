"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { CHANNELS, type Channel } from "@/lib/constants";
import { createSessionToken, requireSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { londonWallClockToDate } from "@/lib/dates";
import {
  keyDateCreateSchema,
  keyDateUpdateSchema,
  performanceCreateSchema,
  performanceUpdateSchema,
  postCreateSchema,
  postUpdateSchema,
  qrCreateSchema,
  qrUpdateSchema,
  showSettingsUpdateSchema,
  taskCreateSchema,
  taskUpdateSchema,
} from "@/lib/schemas";
import { safeEqual } from "@/lib/safe-equal";
import { createPost, updatePost } from "@/lib/services/posts";
import { createQrLink, updateQrLink } from "@/lib/services/qr";
import { createKeyDate, createPerformance, updateKeyDate, updatePerformance, updateShowSettings } from "@/lib/services/show";
import { completeTask, createTask, shiftTask, updateTask } from "@/lib/services/tasks";

/** Blank form fields become undefined (or null where a field is clearable). */
function str(fd: FormData, name: string): string | undefined {
  const v = fd.get(name);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

function strictStr(fd: FormData, name: string): string | undefined {
  // For fields where an empty string is a legitimate value (clearing notes etc.).
  const v = fd.get(name);
  return typeof v === "string" ? v : undefined;
}

function message(err: unknown): string {
  if (err instanceof ZodError) return err.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; ");
  return err instanceof Error ? err.message : "Something went wrong";
}

/** Run a mutation; on failure, bounce back to `path` with the message in ?error=. */
async function attempt(path: string, fn: () => Promise<void>): Promise<void> {
  await requireSession();
  let failure: string | undefined;
  try {
    await fn();
  } catch (err) {
    failure = message(err);
  }
  if (failure) redirect(`${path}${path.includes("?") ? "&" : "?"}error=${encodeURIComponent(failure)}`);
}

function refresh() {
  revalidatePath("/", "layout");
}

// ---------- auth ----------

export async function loginAction(formData: FormData) {
  const expected = process.env.DASHBOARD_PASSWORD;
  const given = strictStr(formData, "password") ?? "";
  if (!expected || !safeEqual(given, expected)) {
    await new Promise((r) => setTimeout(r, 600));
    redirect("/login?error=1");
  }
  // Host-only cookie: no Domain attribute, so it isn't shared with the main HATS website.
  (await cookies()).set(SESSION_COOKIE, await createSessionToken(), sessionCookieOptions);
  redirect("/");
}

export async function logoutAction() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

// ---------- archive / restore (one action for every entity; nothing is ever hard-deleted) ----------

const ARCHIVABLE = ["task", "post", "qr", "keyDate", "performance"] as const;
type Archivable = (typeof ARCHIVABLE)[number];

export async function setArchivedAction(formData: FormData) {
  const entity = ARCHIVABLE.find((e) => e === str(formData, "entity")) as Archivable | undefined;
  const id = str(formData, "id") ?? "";
  const archived = str(formData, "archived") === "true";
  const back = str(formData, "back");
  // Only ever bounce to an internal path.
  const path = back && /^\/[a-zA-Z0-9\-_/?=&]*$/.test(back) ? back : "/";
  await attempt(path, async () => {
    switch (entity) {
      case "task":
        await updateTask(id, taskUpdateSchema.parse({ archived }), "web");
        break;
      case "post":
        await updatePost(id, postUpdateSchema.parse({ archived }), "web");
        break;
      case "qr":
        await updateQrLink(id, qrUpdateSchema.parse({ archived }), "web");
        break;
      case "keyDate":
        await updateKeyDate(id, keyDateUpdateSchema.parse({ archived }), "web");
        break;
      case "performance":
        await updatePerformance(id, performanceUpdateSchema.parse({ archived }), "web");
        break;
      default:
        throw new Error("Unknown item type");
    }
  });
  refresh();
  redirect(path);
}

// ---------- tasks ----------

export async function addTaskAction(formData: FormData) {
  await attempt("/tasks", async () => {
    await createTask(
      taskCreateSchema.parse({
        title: str(formData, "title"),
        category: str(formData, "category"),
        dueDate: str(formData, "dueDate") ?? null,
        priority: str(formData, "priority"),
      }),
      "web",
    );
  });
  refresh();
  redirect("/tasks");
}

export async function updateTaskAction(formData: FormData) {
  const id = str(formData, "id") ?? "";
  await attempt(`/tasks/${id}`, async () => {
    await updateTask(
      id,
      taskUpdateSchema.parse({
        title: str(formData, "title"),
        category: str(formData, "category"),
        description: strictStr(formData, "description"),
        dueDate: str(formData, "dueDate") ?? null,
        status: str(formData, "status"),
        priority: str(formData, "priority"),
        notes: strictStr(formData, "notes"),
      }),
      "web",
    );
  });
  refresh();
  redirect("/tasks");
}

export async function completeTaskAction(formData: FormData) {
  await attempt("/", async () => void (await completeTask(str(formData, "id") ?? "", "web")));
  refresh();
}

export async function shiftTaskAction(formData: FormData) {
  const days = Number(str(formData, "days"));
  if (!Number.isInteger(days) || Math.abs(days) > 31) throw new Error("Invalid shift");
  await attempt("/", async () => void (await shiftTask(str(formData, "id") ?? "", days, "web")));
  refresh();
}

// ---------- posts ----------

function postFields(formData: FormData) {
  const channels = formData.getAll("channels").filter((c): c is Channel => CHANNELS.includes(c as Channel));
  const when = str(formData, "scheduledFor");
  return {
    title: str(formData, "title"),
    scheduledFor: when ? londonWallClockToDate(when).toISOString() : null,
    channels,
    pillar: str(formData, "pillar"),
    caption: strictStr(formData, "caption"),
    visualBrief: strictStr(formData, "visualBrief"),
    assetLink: strictStr(formData, "assetLink"),
    status: str(formData, "status"),
    notes: strictStr(formData, "notes"),
  };
}

export async function savePostAction(formData: FormData) {
  const id = str(formData, "id");
  const back = id ? `/posts/${id}` : "/posts/new";
  await attempt(back, async () => {
    if (id) await updatePost(id, postUpdateSchema.parse(postFields(formData)), "web");
    else await createPost(postCreateSchema.parse(postFields(formData)), "web");
  });
  refresh();
  redirect("/posts");
}

// ---------- QR ----------

export async function createQrAction(formData: FormData) {
  await attempt("/qr", async () => {
    await createQrLink(
      qrCreateSchema.parse({
        label: str(formData, "label"),
        placementType: str(formData, "placementType"),
        slug: str(formData, "slug"),
        destinationUrl: str(formData, "destinationUrl"),
      }),
      "web",
    );
  });
  refresh();
  redirect("/qr");
}

/** Every field except the slug, which is printed and therefore read-only. */
export async function updateQrAction(formData: FormData) {
  await attempt("/qr", async () => {
    await updateQrLink(
      str(formData, "id") ?? "",
      qrUpdateSchema.parse({
        label: str(formData, "label"),
        placementType: str(formData, "placementType"),
        destinationUrl: str(formData, "destinationUrl"),
        utmSource: strictStr(formData, "utmSource"),
        utmMedium: strictStr(formData, "utmMedium"),
        utmCampaign: strictStr(formData, "utmCampaign"),
        utmContent: strictStr(formData, "utmContent"),
        notes: strictStr(formData, "notes"),
        isActive: formData.get("isActive") === "on",
      }),
      "web",
    );
  });
  refresh();
  redirect("/qr");
}

// ---------- show ----------

export async function updateShowSettingsAction(formData: FormData) {
  await attempt("/show", async () => {
    await updateShowSettings(
      showSettingsUpdateSchema.parse({
        name: str(formData, "name"),
        utmCampaign: str(formData, "utmCampaign"),
        defaultDestinationUrl: str(formData, "defaultDestinationUrl"),
      }),
      "web",
    );
  });
  refresh();
  redirect("/show");
}

export async function saveKeyDateAction(formData: FormData) {
  const id = str(formData, "id");
  await attempt("/show", async () => {
    const fields = {
      label: str(formData, "label"),
      date: str(formData, "date"),
      endDate: str(formData, "endDate") ?? null,
      kind: str(formData, "kind"),
      isProposed: formData.get("isProposed") === "on",
      notes: strictStr(formData, "notes"),
    };
    if (id) await updateKeyDate(id, keyDateUpdateSchema.parse(fields), "web");
    else await createKeyDate(keyDateCreateSchema.parse(fields), "web");
  });
  refresh();
  redirect("/show");
}

export async function savePerformanceAction(formData: FormData) {
  const id = str(formData, "id");
  await attempt("/show", async () => {
    const when = str(formData, "startsAt");
    const fields = {
      startsAt: when ? londonWallClockToDate(when).toISOString() : undefined,
      label: str(formData, "label") ?? null,
      notes: strictStr(formData, "notes"),
    };
    if (id) await updatePerformance(id, performanceUpdateSchema.parse(fields), "web");
    else await createPerformance(performanceCreateSchema.parse(fields), "web");
  });
  refresh();
  redirect("/show");
}
