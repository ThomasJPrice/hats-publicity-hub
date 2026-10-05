import Link from "next/link";
import { logoutAction } from "@/app/actions";
import { londonToday } from "@/lib/dates";
import { daysToOpeningNight } from "@/lib/show";
import { listPerformances, getShowSettings } from "@/lib/services/show";

const NAV = [
  ["/", "Home"],
  ["/tasks", "Tasks"],
  ["/calendar", "Calendar"],
  ["/posts", "Posts"],
  ["/qr", "QR"],
  ["/show", "Show"],
] as const;

function countdown(days: number | null): string {
  if (days === null) return "No performances scheduled";
  if (days > 0) return `${days} day${days === 1 ? "" : "s"} to opening night`;
  return days === 0 ? "Opening night is tonight" : "Show has opened";
}

/** Header and navigation. The show name and countdown come from the database. */
export async function AppShell({ children }: { children: React.ReactNode }) {
  const [settings, performances] = await Promise.all([getShowSettings(), listPerformances()]);
  const days = daysToOpeningNight(performances, londonToday());

  return (
    <div className="mx-auto max-w-3xl pb-16">
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 pt-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-brand">{settings.name}</div>
            <div className="text-xs text-stone-500">{countdown(days)}</div>
          </div>
          <form action={logoutAction}>
            <button className="text-xs text-stone-500 underline">Sign out</button>
          </form>
        </div>
        <nav className="mt-1 grid grid-cols-6 text-center text-[13px]">
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
