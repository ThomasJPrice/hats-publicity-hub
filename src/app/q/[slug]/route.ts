import { after, NextResponse, type NextRequest } from "next/server";
import { resolveScan } from "@/lib/redirect";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const { location, log } = await resolveScan(slug, request.headers.get("user-agent"));

  if (log) after(log);

  // 302, never cached, so every scan reaches us.
  const response = NextResponse.redirect(location, 302);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
