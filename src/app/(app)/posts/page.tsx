import Link from "next/link";
import { CHANNELS, POST_STATUSES, humanise } from "@/lib/constants";
import { formatInstant } from "@/lib/dates";
import { listPosts } from "@/lib/services/posts";
import { ArchiveButton } from "@/components/archive-button";
import { CopyButton } from "@/components/copy-button";
import { Empty, PostStatusBadge, oneOf, qs } from "@/components/ui";

export default async function PostsPage({ searchParams }: { searchParams: Promise<{ status?: string; channel?: string; archived?: string }> }) {
  const sp = await searchParams;
  const status = oneOf(sp.status, POST_STATUSES);
  const channel = oneOf(sp.channel, CHANNELS);
  const showArchived = sp.archived === "1";
  const arch = showArchived ? "1" : undefined;
  const posts = await listPosts({ status, channel, includeArchived: showArchived });

  const chip = (label: string, href: string, active: boolean) => (
    <Link
      key={label}
      href={href}
      className={`shrink-0 rounded-full border px-3 py-1 text-xs ${active ? "border-brand bg-brand text-white" : "border-stone-300 bg-white"}`}
    >
      {label}
    </Link>
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Posts</h1>
        <Link href="/posts/new" className="btn btn-primary btn-sm">New post</Link>
      </div>
      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {chip("Any status", `/posts${qs({ channel, archived: arch })}`, !status)}
        {POST_STATUSES.map((s) => chip(humanise(s), `/posts${qs({ status: s, channel, archived: arch })}`, status === s))}
      </div>
      <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1">
        {chip(showArchived ? "Hide archived" : "Show archived", `/posts${qs({ status, channel, archived: showArchived ? undefined : "1" })}`, showArchived)}
        {chip("Any channel", `/posts${qs({ status, archived: arch })}`, !channel)}
        {CHANNELS.map((c) => chip(humanise(c), `/posts${qs({ status, channel: c, archived: arch })}`, channel === c))}
      </div>

      <ul className="mt-4 space-y-2">
        {posts.length === 0 && <Empty>No posts match.</Empty>}
        {posts.map((p) => (
          <li key={p.id} className={`card ${p.archivedAt ? "opacity-60" : ""}`}>
            <div className="flex items-start justify-between gap-2">
              <Link href={`/posts/${p.id}`} className="text-sm font-medium">{p.title}</Link>
              <PostStatusBadge status={p.status} />
            </div>
            <p className="mt-1 text-xs text-stone-500">
              {p.scheduledFor ? formatInstant(p.scheduledFor, "EEE d MMM yyyy, HH:mm") : "Unscheduled"} ·{" "}
              {p.channels.map(humanise).join(", ") || "no channels"} · {humanise(p.pillar)}
            </p>
            {p.caption && <p className="mt-1 line-clamp-2 text-xs text-stone-600">{p.caption}</p>}
            <div className="mt-2 flex gap-2">
              <CopyButton text={p.caption} />
              {p.archivedAt && <ArchiveButton entity="post" id={p.id} archived back={`/posts${qs({ status, channel, archived: arch })}`} />}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
