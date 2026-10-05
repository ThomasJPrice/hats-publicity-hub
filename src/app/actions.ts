"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { CHANNELS, type Channel } from "@/lib/constants";
import { createSessionToken, requireSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { londonWallClockToDate } from "@/lib/dates";
import { postCreateSchema, postUpdateSchema, qrCreateSchema, qrUpdateSchema, taskCreateSchema, taskUpdateSchema } from "@/lib/schemas";
import { safeEqual } from "@/lib/safe-equal";
import { archivePost, createPost, updatePost } from "@/lib/services/posts";
import { createQrLink, updateQrLink } from "@/lib/services/qr";
import { archiveTask, completeTask, createTask, shiftTask, updateTask } from "@/lib/services/tasks";

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
  (await cookies()).set(SESSION_COOKIE, await createSessionToken(), sessionCookieOptions);
  redirect("/");
}

export async function logoutAction() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
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

export async function archiveTaskAction(formData: FormData) {
  await attempt("/tasks", () => archiveTask(str(formData, "id") ?? "", "web"));
  refresh();
  redirect("/tasks");
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

export async function archivePostAction(formData: FormData) {
  await attempt("/posts", () => archivePost(str(formData, "id") ?? "", "web"));
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

export async function updateQrAction(formData: FormData) {
  await attempt("/qr", async () => {
    await updateQrLink(
      str(formData, "id") ?? "",
      qrUpdateSchema.parse({
        label: str(formData, "label"),
        destinationUrl: str(formData, "destinationUrl"),
        notes: strictStr(formData, "notes"),
        isActive: formData.get("isActive") === "on",
      }),
      "web",
    );
  });
  refresh();
  redirect("/qr");
}
