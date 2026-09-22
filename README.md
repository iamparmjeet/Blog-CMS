# Blog-CMS (ContentOS)

A single-user, self-hosted blog content management system built on **TanStack Start**. It pairs a rich **TipTap** editor with AI-assisted writing (generation + social repurposing via OpenRouter), R2-backed media storage, and Umami analytics — all behind an OAuth-only, claim-once auth model.

## Features

- **Rich editor** — TipTap v3 with slash commands, code blocks (lowlight highlighting + language picker), inline image/video upload to R2, bubble menu, SEO tab with live Google preview, autosave, and live preview overlay.
- **Post management** — create, edit, soft-delete / restore / purge, bulk operations, draft ↔ published toggle.
- **AI writing** — streamed post generation from your saved writing style, and repurposing into Twitter / LinkedIn / Instagram / Reels copy.
- **Media library** — R2 presigned uploads with IndexedDB caching and blur-up placeholders.
- **Settings** — accent color, default model, writing style/sample, CORS allowlist for the public feed, Umami analytics, R2 bucket config.
- **Analytics** — Umami share-URL dashboard.
- **Dashboard** — at-a-glance home with real writing stats (total words, post/Publish counts, monthly goal progress), a 12-week **writing-activity heatmap** derived from actual per-day word counts, and recent/continue-writing shortcuts.
- **Public JSON API** — CORS-gated published-post feed at `/api/posts` and `/api/posts/$slug`.
- **Auth** — OAuth (GitHub + Google) only, single-owner "claim once" model. The first person to sign in becomes the permanent owner; later sign-in attempts are blocked.
- **Command palette** + keyboard shortcuts in the authenticated shell.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | TanStack Start (React Router SSR) |
| Styling | Tailwind CSS v4 + shadcn |
| DB / ORM | Drizzle ORM with Cloudflare D1 |
| Auth | better-auth (OAuth) |
| Editor | TipTap v3 + lowlight |
| AI | OpenRouter (chat completions) |
| Media | Cloudflare R2 (AWS SDK S3) |
| Analytics | Umami |
| Deploy | Cloudflare Workers (`wrangler`) |
| Tooling | Biome, Vitest, Vite 8, React Compiler |

## Prerequisites

- Bun 1.4+
- OAuth apps for **GitHub** and **Google**
- A **Cloudflare R2** bucket (for media) — optional in dev
- An **OpenRouter** API key (for AI features)

## Setup

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Configure environment**

   Copy `.env.example` to `.env.local` and fill in the values:

   ```bash
   cp .env.example .env.local
   ```

   | Variable | Required | Purpose |
   |----------|----------|---------|
   | `BETTER_AUTH_SECRET` | ✅ | Session signing secret (any long random string) |
   | `BETTER_AUTH_URL` | ✅ | Auth base URL, e.g. `http://localhost:3000` |
   | `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | ✅ | GitHub OAuth app |
   | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | ✅ | Google OAuth app |
   | `OPENROUTER_API_KEY` (or `OPENROUTER_KEY`) | ✅* | AI generation / repurpose (*required for AI) |
   | `R2_*` | ⬜ | Cloudflare R2 media storage |
   | `UMAMI_*` | ⬜ | Umami analytics |
   | `VITE_APP_TITLE` | ⬜ | Client-side app title |

   `.env.local` is gitignored and holds your secrets.

3. **Set up the database**

   ```bash
   bun run db:generate   # create migrations from schema
   bun run db:migrate    # apply to the local D1 database (Wrangler)
   ```

4. **Run the dev server**

   ```bash
   bun run dev
   ```

   Open http://localhost:3000. The first OAuth sign-in claims the instance as the owner.

## Database Studio

Use the local Studio command to inspect the same D1 database as `bun run dev`:

```bash
bun run db:studio:local
```

The local Worker state lives at `$XDG_RUNTIME_DIR/contentos-wrangler-state`
(or `/tmp/contentos-wrangler-state`) and is cleared after a reboot or new login
session. Run `bun run db:migrate` before starting Studio or the development
server when that happens.

To inspect the remote D1 database, set these values in `.env.local` and run the
remote command:

```bash
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_D1_DATABASE_ID=
CLOUDFLARE_API_TOKEN=

bun run db:studio:remote
```

The API token requires D1 Read and D1 Write permissions for the database.

### Provision Remote D1

Local D1 state is not automatically created in Cloudflare or synchronized with a
remote database. Provision the remote database before deploying (full flow in
[docs/deploy.md](./docs/deploy.md)):

```bash
# An API token (including an empty placeholder) prevents OAuth login.
unset CLOUDFLARE_API_TOKEN
bunx wrangler login
bunx wrangler whoami

# Confirm the target account, then create the database.
bunx wrangler d1 list
bunx wrangler d1 create blog-cms
```

Copy the `database_id` printed by `d1 create` into both
`wrangler.jsonc` (`d1_databases[0].database_id`) and
`CLOUDFLARE_D1_DATABASE_ID` in `.env.local`. Then apply and inspect the remote
schema:

```bash
bun run db:migrate:remote
bunx wrangler d1 info blog-cms
bun run deploy:check
```

Common D1 inspection commands:

```bash
bunx wrangler d1 list
bunx wrangler d1 info blog-cms
bunx wrangler d1 migrations list blog-cms --remote
bunx wrangler d1 execute blog-cms --remote --command 'SELECT name FROM sqlite_master WHERE type = "table";'
```

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start dev server (port 3000) |
| `bun run build` | Production build (Cloudflare worker) |
| `bun run preview` | Preview the build |
| `bun run test` | Run Vitest |
| `bun run check` / `bun run lint` / `bun run format` | Biome |
| `bun run db:generate` | Generate Drizzle SQL from the schema |
| `bun run db:migrate` | Apply migrations to the local D1 database |
| `bun run db:migrate:remote` | Apply migrations to remote D1 (after provisioning) |
| `bun run db:studio:local` | Open Drizzle Studio for the local D1 database |
| `bun run db:studio:remote` | Open Drizzle Studio for remote D1 using Cloudflare API credentials |
| `bunx wrangler d1 list` | List D1 databases in the authenticated Cloudflare account |
| `bunx wrangler d1 info blog-cms` | Inspect the remote `blog-cms` database |
| `bun run deploy:check` | Validate D1/R2 bindings and placeholder database id |
| `bun run deploy:preview` | Build and deploy a preview Worker (same as `deploy`) |
| `bun run deploy` | `bun run build && wrangler deploy` (production) |

See [docs/deploy.md](./docs/deploy.md) for the full preview vs production flow,
required secrets (`BETTER_AUTH_*`, OAuth, optional `R2_*` / `UMAMI_*`), and the
post-deploy smoke checklist.

## Usage

1. **Sign in** with GitHub or Google — the first login owns the instance.
2. **Write** — go to *Posts → New*. Use the slash menu (`/`) for blocks, the bubble menu for inline formatting, and the media button to upload images/videos. Toggle **Draft / Published** to control visibility.
3. **SEO** — open the SEO tab to set title, slug, and description with a live Google preview.
4. **AI** — use *Generate* to draft a post from your saved writing style, or *Repurpose* to spin a post into social snippets.
5. **Media** — the Media page lists uploaded assets cached locally for fast reload.
6. **Settings** — configure accent color, default model, writing style, CORS origins for the public feed, and Umami.
7. **Public feed** — published posts are served as JSON at `/api/posts` (CORS-restricted by your allowlist) for external consumption.

## Project Structure

```
src/
  db/                 Drizzle schema + client (full-schema merges app + auth)
  routes/             TanStack Start routes (_public, _authenticated, api)
  components/content-os/   The TipTap editor + supporting UI
  lib/                auth, session, r2, ai, env
  styles/             Tailwind / global CSS
  db/drizzle/         Regenerated baseline migrations
```

## Known Gaps & TODO

These are tracked and not yet implemented:

- **Deployment DB** — local development and the Worker runtime use Cloudflare D1 through the `DB` binding. Remote provisioning and the preview/production flow are documented in [docs/deploy.md](./docs/deploy.md) (M1.3); run `bun run deploy:check` before deploying.
- **Comments** — no comments table or UI yet.
- **Scheduling** — `PostStatus` includes `"scheduled"` but no scheduler exists.

## License

See [LICENSE](./LICENSE).
