import type { PostStatus, TaskCategory, TaskPriority } from "@/lib/constants";
import { humanise } from "@/lib/constants";

const CATEGORY_STYLE: Record<TaskCategory, string> = {
  social: "bg-sky-100 text-sky-800",
  content: "bg-violet-100 text-violet-800",
  print: "bg-amber-100 text-amber-800",
  press: "bg-rose-100 text-rose-800",
  email: "bg-teal-100 text-teal-800",
  ticketing: "bg-emerald-100 text-emerald-800",
  admin: "bg-stone-200 text-stone-700",
};

const POST_STATUS_STYLE: Record<PostStatus, string> = {
  idea: "bg-stone-200 text-stone-700",
  drafted: "bg-amber-100 text-amber-800",
  scheduled: "bg-sky-100 text-sky-800",
  posted: "bg-emerald-100 text-emerald-800",
};

export function Badge({ children, className = "bg-stone-100 text-stone-700" }: { children: React.ReactNode; className?: string }) {
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${className}`}>{children}</span>;
}

export const CategoryBadge = ({ category }: { category: TaskCategory }) => (
  <Badge className={CATEGORY_STYLE[category]}>{humanise(category)}</Badge>
);

export const PostStatusBadge = ({ status }: { status: PostStatus }) => (
  <Badge className={POST_STATUS_STYLE[status]}>{humanise(status)}</Badge>
);

export const PriorityMark = ({ priority }: { priority: TaskPriority }) =>
  priority === "high" ? <Badge className="bg-red-100 text-red-800">High</Badge> : null;

export function ErrorNote({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
      {message}
    </p>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed border-stone-300 px-3 py-4 text-center text-sm text-stone-500">{children}</p>;
}

/** Build a query string, dropping empty values. */
export function qs(params: Record<string, string | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : "";
}

/** Return `value` only if it is one of `allowed`; for validating search params. */
export function oneOf<T extends string>(value: string | undefined, allowed: readonly T[]): T | undefined {
  return allowed.find((a) => a === value);
}
