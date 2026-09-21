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
   bun run db:migrate    # apply to the remote contentos-dev D1 database
   ```

4. **Run the dev server**

   ```bash
   bun run dev
   ```

   Open http://localhost:3000. The first OAuth sign-in claims the instance as the owner.

## Database Studio

`bun run dev` uses the remote `contentos-dev` D1 database. To inspect it with
Drizzle Studio, set the remote credentials below in `.env.local`:

```bash
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=

bun run db:studio
```

The API token requires D1 Read and D1 Write permissions for the database. The
development Studio command selects `contentos-dev`; production access is always
explicit:

```bash
bun run db:studio:production
```

Treat production Studio as live database access: edits apply immediately.

### Production D1

Development and production use separate remote D1 databases. `bun run dev`
selects `contentos-dev`; deployment and production migrations explicitly select
`contentos-prod`.

```bash
bun run db:migrate:production
bunx wrangler d1 info contentos-prod
```

Common D1 inspection commands:

```bash
bunx wrangler d1 list
bunx wrangler d1 migrations list DB --env development --remote
bunx wrangler d1 migrations list DB --env production --remote
bunx wrangler d1 execute DB --env production --remote --command 'SELECT name FROM sqlite_master WHERE type = "table";'
```

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start dev server (port 3000) with the remote development bindings |
| `bun run build` | Production build using production binding definitions |
| `bun run preview` | Preview the production build |
| `bun run test` | Run Vitest |
| `bun run check` / `bun run lint` / `bun run format` | Biome |
| `bun run db:generate` | Generate Drizzle SQL from the schema |
| `bun run db:migrate` | Apply migrations to the remote `contentos-dev` D1 database |
| `bun run db:migrate:production` | Apply migrations to the remote `contentos-prod` D1 database |
| `bun run db:studio` | Open Drizzle Studio for `contentos-dev` |
| `bun run db:studio:production` | Open Drizzle Studio for `contentos-prod` |
| `bunx wrangler d1 list` | List D1 databases in the authenticated Cloudflare account |
| `bun run deploy` | Build and deploy with the production bindings |

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

- **Deployment DB** — local development and the Worker runtime use Cloudflare D1 through the `DB` binding. The committed database ID is a placeholder until provisioning (T1.4).
- **Comments** — no comments table or UI yet.
- **Scheduling** — `PostStatus` includes `"scheduled"` but no scheduler exists.

## License

See [LICENSE](./LICENSE).
