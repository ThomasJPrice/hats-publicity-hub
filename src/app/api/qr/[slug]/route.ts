import QRCode from "qrcode";
import { NextResponse, type NextRequest } from "next/server";
import { shortUrl } from "@/lib/qr-url";
import { findLinkBySlug } from "@/lib/services/qr";

export const dynamic = "force-dynamic";

// Authenticated by the proxy (everything under /api except /api/mcp needs a session).
export async function GET(request: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const link = await findLinkBySlug(slug);
  if (!link) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const params = request.nextUrl.searchParams;
  const format = params.get("format") === "png" ? "png" : "svg";
  const download = params.get("download") === "1";
  // Encode the short URL only; level Q; 4-module quiet zone; black on white; no logo.
  const options = { errorCorrectionLevel: "Q", margin: 4, color: { dark: "#000000", light: "#ffffff" } } as const;
  const target = shortUrl(link.slug);

  const headers: Record<string, string> = { "Cache-Control": "private, no-store" };
  if (download) headers["Content-Disposition"] = `attachment; filename="qr-${link.slug}.${format}"`;

  if (format === "png") {
    const png = await QRCode.toBuffer(target, { ...options, type: "png", width: 1200 });
    return new Response(new Uint8Array(png), { headers: { ...headers, "Content-Type": "image/png" } });
  }
  const svg = await QRCode.toString(target, { ...options, type: "svg" });
  return new Response(svg, { headers: { ...headers, "Content-Type": "image/svg+xml" } });
}
