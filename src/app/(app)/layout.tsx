import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/actions";
import { hasSession } from "@/lib/auth";
import { londonToday } from "@/lib/dates";
import { daysToOpeningNight, SHOW_NAME, SHOW_TITLE } from "@/lib/show";

export const dynamic = "force-dynamic";

const NAV = [
  ["/", "Home"],
  ["/tasks", "Tasks"],
  ["/calendar", "Calendar"],
  ["/posts", "Posts"],
  ["/qr", "QR"],
] as const;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!(await hasSession())) redirect("/login");
  const days = daysToOpeningNight(londonToday());

  return (
    <div className="mx-auto max-w-3xl pb-16">
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 pt-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-brand">
              {SHOW_NAME}: {SHOW_TITLE}
            </div>
            <div className="text-xs text-stone-500">
              {days > 0 ? `${days} days to opening night` : days === 0 ? "Opening night is tonight" : "Show has opened"}
            </div>
          </div>
          <form action={logoutAction}>
            <button className="text-xs text-stone-500 underline">Sign out</button>
          </form>
        </div>
        <nav className="mt-1 grid grid-cols-5 text-center text-sm">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className="py-2.5 font-medium text-stone-700 hover:bg-stone-50">
              {label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="px-4 pt-4">{children}</main>
    </div>
  );
}
