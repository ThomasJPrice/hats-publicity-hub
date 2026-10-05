import Link from "next/link";
import { notFound } from "next/navigation";
import { archiveTaskAction, completeTaskAction, updateTaskAction } from "@/app/actions";
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
  if (!task || task.archivedAt) notFound();

  return (
    <div>
      <Link href="/tasks" className="text-sm text-stone-500">← Tasks</Link>
      <h1 className="mb-3 mt-1 text-lg font-semibold">Edit task</h1>
      <ErrorNote message={error} />
      <form action={updateTaskAction} className="card">
        <TaskFields task={task} />
        <button className="btn btn-primary mt-4 w-full">Save</button>
      </form>
      <div className="mt-3 flex gap-2">
        {task.status !== "done" && (
          <form action={completeTaskAction}>
            <input type="hidden" name="id" value={task.id} />
            <button className="btn">Mark done</button>
          </form>
        )}
        <form action={archiveTaskAction}>
          <input type="hidden" name="id" value={task.id} />
          <button className="btn">Archive</button>
        </form>
      </div>
    </div>
  );
}
