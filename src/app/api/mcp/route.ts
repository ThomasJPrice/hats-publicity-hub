import { createMcpHandler } from "mcp-handler";
import { registerTools } from "@/lib/mcp/tools";
import { safeEqual } from "@/lib/safe-equal";

export const dynamic = "force-dynamic";

const handler = createMcpHandler(registerTools, {
  serverInfo: { name: "hats-publicity", version: "1.0.0" },
  instructions:
    "HATS Panto 2027 (The Wizard of Oz) publicity hub. Weeks run Monday to Sunday in London time. Nothing here publishes or sends anything.",
});

function authorised(request: Request): boolean {
  const expected = process.env.MCP_API_TOKEN;
  if (!expected) return false;
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer (.+)$/i.exec(header);
  return !!match && safeEqual(match[1], expected);
}

async function guarded(request: Request): Promise<Response> {
  if (!authorised(request)) {
    return new Response(JSON.stringify({ error: "Unauthorised" }), {
      status: 401,
      headers: { "Content-Type": "application/json", "WWW-Authenticate": "Bearer" },
    });
  }
  return handler(request);
}

export { guarded as GET, guarded as POST, guarded as DELETE };
