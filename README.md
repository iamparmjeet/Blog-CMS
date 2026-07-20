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
| DB / ORM | Drizzle ORM — **SQLite (better-sqlite3)** in dev |
| Auth | better-auth (OAuth) |
| Editor | TipTap v3 + lowlight |
| AI | OpenRouter (chat completions) |
| Media | Cloudflare R2 (AWS SDK S3) |
| Analytics | Umami |
| Deploy | Cloudflare Workers (`wrangler`) |
| Tooling | Biome, Vitest, Vite 8, React Compiler |

## Prerequisites

- Node.js 22+ (tested on 26) or Bun
- A package manager: `pnpm` (recommended), `npm`, or `bun`
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
   | `DATABASE_URL` | ✅ | SQLite file path, e.g. `dev.db` |
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
   pnpm db:generate   # create migrations from schema
   pnpm db:migrate    # apply to local SQLite
   ```

4. **Run the dev server**

   ```bash
   pnpm dev
   ```

   Open http://localhost:3000. The first OAuth sign-in claims the instance as the owner.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server (port 3000) |
| `pnpm build` | Production build (Cloudflare worker) |
| `pnpm preview` | Preview the build |
| `pnpm test` | Run Vitest |
| `pnpm check` / `pnpm lint` / `pnpm format` | Biome |
| `pnpm db:generate` / `db:migrate` / `db:push` / `db:pull` / `db:studio` | Drizzle workflows |
| `pnpm deploy` | `bun run build && wrangler deploy` |

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
drizzle/              Migrations
```

## Known Gaps & TODO

These are tracked and not yet implemented:

- **Deployment DB** — dev uses `better-sqlite3` (native module). Cloudflare Workers can't run native SQLite, so production needs a D1 binding (or a Node runtime) before `wrangler deploy` will work at runtime.
- **Migrations** — the Drizzle journal references a `0004` migration with no snapshot file; regenerate before running `db:migrate`.
- **Comments** — no comments table or UI yet.
- **Scheduling** — `PostStatus` includes `"scheduled"` but no scheduler exists.

## License

See [LICENSE](./LICENSE).
