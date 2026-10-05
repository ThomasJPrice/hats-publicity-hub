import { TASK_CATEGORIES, TASK_PRIORITIES, TASK_STATUSES, humanise } from "@/lib/constants";
import type { Task } from "@/lib/db/schema";

export function TaskFields({ task }: { task: Task }) {
  return (
    <div className="space-y-3">
      <input type="hidden" name="id" value={task.id} />
      <div>
        <label className="label" htmlFor="title">Title</label>
        <input id="title" name="title" defaultValue={task.title} required className="input" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="category">Category</label>
          <select id="category" name="category" defaultValue={task.category} className="input">
            {TASK_CATEGORIES.map((c) => (
              <option key={c} value={c}>{humanise(c)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="dueDate">Due</label>
          <input id="dueDate" name="dueDate" type="date" defaultValue={task.dueDate ?? ""} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={task.status} className="input">
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>{humanise(s)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="priority">Priority</label>
          <select id="priority" name="priority" defaultValue={task.priority} className="input">
            {TASK_PRIORITIES.map((p) => (
              <option key={p} value={p}>{humanise(p)}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="description">Description</label>
        <textarea id="description" name="description" defaultValue={task.description} rows={3} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="notes">Notes</label>
        <textarea id="notes" name="notes" defaultValue={task.notes} rows={4} className="input" />
      </div>
    </div>
  );
}
