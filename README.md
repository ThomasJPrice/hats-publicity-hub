# HATS Panto Publicity Hub

A small private app for one person and one show: **HATS Panto 2027, The Wizard of Oz (22 to 30 January 2027)**.
Tasks, a calendar of posts and key dates, tracked QR short links, and an MCP server so Claude can read and update all of it.
Spec: `hats-publicity-hub-spec.md`.

**Nothing is hard-coded.** Show settings, key dates, performances, tasks, posts and QR links all live in the database. The seed (`src/seed/`) loads starter data once; after that every field is editable in the web UI and through MCP (a QR link's slug is the one exception, because it is printed).

Stack: Next.js 16 (App Router), Tailwind 4, Neon Postgres + Drizzle, zod, date-fns-tz (Europe/London), `qrcode`, `mcp-handler`.

## Layout

Business logic lives in `src/lib/services/*`. Server Actions (`src/app/actions.ts`), route handlers and MCP tools (`src/lib/mcp/tools.ts`) are thin wrappers that validate with zod (`src/lib/schemas.ts`) and call the services.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in every value (see below)
npm run db:migrate           # applies drizzle/*.sql to DATABASE_URL
npm run db:seed              # show settings, 8 key dates, 7 performances, 36 tasks, 13 posts, 9 QR links
npm run dev
```

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | Neon connection string |
| `DASHBOARD_PASSWORD` | Web UI passcode |
| `SESSION_SECRET` | 32+ random characters; signs the session cookie |
| `MCP_API_TOKEN` | Random bearer token for `/api/mcp` |
| `BASE_URL` | Public origin for short links. **Choose a domain you will keep for years**: printed QR codes encode it |
| `DEFAULT_DESTINATION_URL` | Seeds the *default destination* show setting on first run only. Edit it on the Show page afterwards |

Never put logins for email, Mailchimp, MailerLite, Facebook or NextDoor in this app, the database or the repo.

**Seeding is safe to re-run.** It fills only tables that are completely empty (archived rows count as present), so it never duplicates, overwrites or restores anything. That also means an existing database can be upgraded with `npm run db:migrate` followed by `npm run db:seed`: the new show tables get filled and everything else is left alone.

Seeded posts get a placeholder 09:00 time (London); edit as needed.

## Deploy (Vercel)

Import the repo, add the variables above, and run `npm run db:migrate` and `npm run db:seed` against the Neon database (on every release that adds a migration, run `db:migrate` before deploying). The hub and short links live at `https://publicity.hatsdramagroup.org.uk`, so set `BASE_URL` to that. The session cookie is host-only (no `Domain`), so it isn't shared with the main HATS website.

## Connect Claude (MCP)

```bash
claude mcp add --transport http hats-publicity https://<domain>/api/mcp --header "Authorization: Bearer <MCP_API_TOKEN>"
```

Tools: `get_status_summary`, `get_show_info`, `update_show_settings`, `create_key_date`, `update_key_date`, `create_performance`, `update_performance`, `list_tasks`, `create_task`, `update_task`, `complete_task`, `list_posts`, `create_post`, `update_post`, `list_qr_links`, `create_qr_link`, `update_qr_link`, `get_qr_stats`, `log_activity`, `list_activity`.

Claude can read and write everything in the app. Nothing is hard-deleted, published or sent: every update tool takes `archived: true | false` to archive or restore, and every list tool takes `include_archived`. Repointing an existing QR link's destination requires `confirm: true`, and a slug can never change.

claude.ai custom connectors may need OAuth rather than a static token; that is a "later" item in the spec.

## Behaviour notes

- Weeks run Monday to Sunday, London time. Home buckets are disjoint: *overdue* = open and due before today; *this week* = today to Sunday; *next week* = the following Monday to Sunday. The `this_week` / `next_week` filters on `list_tasks` cover the full Monday to Sunday.
- `/q/[slug]` is public, always 302s (to the default destination for unknown/inactive slugs, or if the database is down), logs the scan after responding, and stores only time, device class and a bot flag. Bots are stored but excluded from every count.
- Nothing is hard-deleted. Archived items are hidden by default ("Show archived" on each list) and can be restored in the UI or via MCP. An archived QR link behaves like an inactive one: its scans go to the default destination.
- Opening night is derived from the earliest non-archived performance, so editing performances updates the Home countdown, the calendar and `get_show_info`.
- `/` for a visitor without a session redirects to the default ticket destination; the login is at `/login`.
- Auth: the Next.js 16 `src/proxy.ts` (formerly middleware) gates everything except `/` (which checks the session itself and otherwise redirects), `/login`, `/q/*` and `/api/mcp`.

## Scripts

`npm run dev | build | start | lint | typecheck | test | db:generate | db:migrate | db:seed`

Tests (Vitest): London week boundaries including both clock changes, task bucketing, derived opening night, the redirect logic, the seed (twice, and after edits and archiving), and service-layer integration tests run against in-memory Postgres (PGlite), including bot exclusion from scan counts and archive/restore.
