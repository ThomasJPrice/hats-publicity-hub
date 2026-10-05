import Link from "next/link";
import { notFound } from "next/navigation";
import { completeTaskAction, updateTaskAction } from "@/app/actions";
import { ArchiveButton } from "@/components/archive-button";
import { ErrorNote } from "@/components/ui";
import { TaskFields } from "@/components/task-form";
import { getTask } from "@/lib/services/tasks";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function TaskPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const task = UUID.test(id) ? await getTask(id) : null;
  if (!task) notFound();
  const archived = task.archivedAt !== null;

  return (
    <div>
      <Link href="/tasks" className="text-sm text-stone-500">← Tasks</Link>
      <h1 className="mb-3 mt-1 text-lg font-semibold">Edit task</h1>
      {archived && (
        <p className="mb-3 rounded-lg border border-stone-300 bg-stone-100 px-3 py-2 text-sm text-stone-700">
          This task is archived. Restore it to see it in the lists again.
        </p>
      )}
      <ErrorNote message={error} />
      <form action={updateTaskAction} className="card">
        <TaskFields task={task} />
        <button className="btn btn-primary mt-4 w-full">Save</button>
      </form>
      <div className="mt-3 flex gap-2">
        {task.status !== "done" && !archived && (
          <form action={completeTaskAction}>
            <input type="hidden" name="id" value={task.id} />
            <button className="btn">Mark done</button>
          </form>
        )}
        <ArchiveButton entity="task" id={task.id} archived={archived} back={archived ? `/tasks/${task.id}` : "/tasks"} className="btn" />
      </div>
    </div>
  );
}
