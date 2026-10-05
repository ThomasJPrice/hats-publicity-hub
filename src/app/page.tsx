import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { HomeContent } from "@/components/home";
import { hasSession } from "@/lib/auth";
import { defaultDestination } from "@/lib/redirect";

export const dynamic = "force-dynamic";

/**
 * Home. Visitors without a session (anyone who lands on the bare domain) go to the ticket page
 * rather than a login form; the login lives at /login.
 */
export default async function RootPage() {
  if (!(await hasSession())) redirect(await defaultDestination());
  return (
    <AppShell>
      <HomeContent />
    </AppShell>
  );
}
