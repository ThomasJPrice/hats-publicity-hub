import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { hasSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!(await hasSession())) redirect("/login");
  return <AppShell>{children}</AppShell>;
}
