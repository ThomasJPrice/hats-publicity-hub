# HATS Panto Publicity Hub

A small private app for one person and one show: **HATS Panto 2027, The Wizard of Oz (22 to 30 January 2027)**.
Tasks, a calendar of posts and key dates, tracked QR short links, and an MCP server so Claude can read and update all of it.
Spec: `hats-publicity-hub-spec.md`. Show dates are hard-coded in `src/lib/show.ts`.

Stack: Next.js 16 (App Router), Tailwind 4, Neon Postgres + Drizzle, zod, date-fns-tz (Europe/London), `qrcode`, `mcp-handler`.

## Layout

Business logic lives in `src/lib/services/*`. Server Actions (`src/app/actions.ts`), route handlers and MCP tools (`src/lib/mcp/tools.ts`) are thin wrappers that validate with zod (`src/lib/schemas.ts`) and call the services.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in every value (see below)
npm run db:migrate           # applies drizzle/*.sql to DATABASE_URL
npm run db:seed              # 36 tasks, 13 posts, 9 QR links (safe to re-run)
npm run dev
```

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | Neon connection string |
| `DASHBOARD_PASSWORD` | Web UI passcode |
| `SESSION_SECRET` | 32+ random characters; signs the session cookie |
| `MCP_API_TOKEN` | Random bearer token for `/api/mcp` |
| `BASE_URL` | Public origin for short links. **Choose a domain you will keep for years**: printed QR codes encode it |
| `DEFAULT_DESTINATION_URL` | Main TicketSource event page (https). Unknown or inactive slugs go here |

Never put logins for email, Mailchimp, MailerLite, Facebook or NextDoor in this app, the database or the repo.

Seeded posts get a placeholder 09:00 time (London); edit as needed. Seeded QR links point at `DEFAULT_DESTINATION_URL` at seed time, so set it before seeding.

## Deploy (Vercel)

Import the repo, add the variables above, and run `npm run db:migrate` and `npm run db:seed` once against the Neon database. Attach your long-term domain and set `BASE_URL` to it **before** generating print artwork.

## Connect Claude (MCP)

```bash
claude mcp add --transport http hats-publicity https://<domain>/api/mcp --header "Authorization: Bearer <MCP_API_TOKEN>"
```

Tools: `get_status_summary`, `get_show_info`, `list_tasks`, `create_task`, `update_task`, `complete_task`, `list_posts`, `create_post`, `update_post`, `list_qr_links`, `create_qr_link`, `update_qr_link`, `get_qr_stats`, `log_activity`, `list_activity`.
Nothing is deleted, published or sent. Repointing an existing QR link's destination requires `confirm: true`.

claude.ai custom connectors may need OAuth rather than a static token; that is a "later" item in the spec.

## Behaviour notes

- Weeks run Monday to Sunday, London time. Home buckets are disjoint: *overdue* = open and due before today; *this week* = today to Sunday; *next week* = the following Monday to Sunday. The `this_week` / `next_week` filters on `list_tasks` cover the full Monday to Sunday.
- `/q/[slug]` is public, always 302s (to the default destination for unknown/inactive slugs, or if the database is down), logs the scan after responding, and stores only time, device class and a bot flag. Bots are stored but excluded from every count.
- Nothing is hard-deleted; use archive.
- Auth: the Next.js 16 `src/proxy.ts` (formerly middleware) gates everything except `/login`, `/q/*` and `/api/mcp`.

## Scripts

`npm run dev | build | start | lint | typecheck | test | db:generate | db:migrate | db:seed`

Tests (Vitest): London week boundaries including both clock changes, task bucketing, the redirect logic, and service-layer integration tests run against in-memory Postgres (PGlite), including bot exclusion from scan counts.
