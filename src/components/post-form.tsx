import { savePostAction } from "@/app/actions";
import { CHANNELS, PILLARS, POST_STATUSES, humanise } from "@/lib/constants";
import { londonInputValue } from "@/lib/dates";
import type { Post } from "@/lib/db/schema";

export function PostForm({ post, defaultDate }: { post?: Post; defaultDate?: string }) {
  const when = post ? londonInputValue(post.scheduledFor) : defaultDate ? `${defaultDate}T09:00` : "";
  return (
    <form action={savePostAction} className="card space-y-3">
      {post && <input type="hidden" name="id" value={post.id} />}
      <div>
        <label className="label" htmlFor="title">Title</label>
        <input id="title" name="title" defaultValue={post?.title} required className="input" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <label className="label" htmlFor="scheduledFor">Scheduled for (London time)</label>
          <input id="scheduledFor" name="scheduledFor" type="datetime-local" defaultValue={when} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={post?.status ?? "idea"} className="input">
            {POST_STATUSES.map((s) => (
              <option key={s} value={s}>{humanise(s)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="pillar">Pillar</label>
          <select id="pillar" name="pillar" defaultValue={post?.pillar ?? "practical"} className="input">
            {PILLARS.map((p) => (
              <option key={p} value={p}>{humanise(p)}</option>
            ))}
          </select>
        </div>
      </div>
      <fieldset>
        <legend className="label">Channels</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {CHANNELS.map((c) => (
            <label key={c} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" name="channels" value={c} defaultChecked={post?.channels.includes(c)} className="size-4" />
              {humanise(c)}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label className="label" htmlFor="caption">Caption</label>
        <textarea id="caption" name="caption" defaultValue={post?.caption} rows={6} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="visualBrief">Visual brief</label>
        <textarea id="visualBrief" name="visualBrief" defaultValue={post?.visualBrief} rows={3} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="assetLink">Asset link</label>
        <input id="assetLink" name="assetLink" defaultValue={post?.assetLink} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="notes">Notes</label>
        <textarea id="notes" name="notes" defaultValue={post?.notes} rows={2} className="input" />
      </div>
      <p className="text-xs text-stone-500">
        This app never publishes. &quot;Scheduled&quot; means scheduled in Meta Business Suite.
      </p>
      <button className="btn btn-primary w-full">Save post</button>
    </form>
  );
}
