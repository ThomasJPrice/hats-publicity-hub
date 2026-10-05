import Link from "next/link";
import { notFound } from "next/navigation";
import { archivePostAction } from "@/app/actions";
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
  if (!post || post.archivedAt) notFound();

  return (
    <div>
      <Link href="/posts" className="text-sm text-stone-500">← Posts</Link>
      <div className="mb-3 mt-1 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Edit post</h1>
        <CopyButton text={post.caption} />
      </div>
      <ErrorNote message={error} />
      <PostForm post={post} />
      <form action={archivePostAction} className="mt-3">
        <input type="hidden" name="id" value={post.id} />
        <button className="btn">Archive</button>
      </form>
    </div>
  );
}
