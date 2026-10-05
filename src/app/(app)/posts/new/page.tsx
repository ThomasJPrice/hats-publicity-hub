import Link from "next/link";
import { ErrorNote } from "@/components/ui";
import { PostForm } from "@/components/post-form";

export default async function NewPostPage({ searchParams }: { searchParams: Promise<{ date?: string; error?: string }> }) {
  const { date, error } = await searchParams;
  const valid = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined;
  return (
    <div>
      <Link href="/posts" className="text-sm text-stone-500">← Posts</Link>
      <h1 className="mb-3 mt-1 text-lg font-semibold">New post</h1>
      <ErrorNote message={error} />
      <PostForm defaultDate={valid} />
    </div>
  );
}
