import Link from "next/link";
import { notFound } from "next/navigation";
import { ArchiveButton } from "@/components/archive-button";
import { CopyButton } from "@/components/copy-button";
import { PostForm } from "@/components/post-form";
import { ErrorNote } from "@/components/ui";
import { getPost } from "@/lib/services/posts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const post = UUID.test(id) ? await getPost(id) : null;
  if (!post) notFound();
  const archived = post.archivedAt !== null;

  return (
    <div>
      <Link href="/posts" className="text-sm text-stone-500">← Posts</Link>
      <div className="mb-3 mt-1 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Edit post</h1>
        <CopyButton text={post.caption} />
      </div>
      {archived && (
        <p className="mb-3 rounded-lg border border-stone-300 bg-stone-100 px-3 py-2 text-sm text-stone-700">
          This post is archived. Restore it to see it in the lists and calendar again.
        </p>
      )}
      <ErrorNote message={error} />
      <PostForm post={post} />
      <div className="mt-3">
        <ArchiveButton entity="post" id={post.id} archived={archived} back={archived ? `/posts/${post.id}` : "/posts"} className="btn" />
      </div>
    </div>
  );
}
