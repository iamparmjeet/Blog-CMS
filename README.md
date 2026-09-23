# PageOwl (formerly ContentOS)

A single-owner, self-hosted blog CMS built on **TanStack Start** and Cloudflare Workers. PageOwl pairs a TipTap editor with optional OpenRouter-assisted drafting and social repurposing, R2-backed media, a CORS-gated public feed, and owner-only analytics. The GitHub repository is [PageOwl](https://github.com/iamparmjeet/PageOwl); the Worker, backup format, and some internal identifiers still use legacy names.

## Features

- **Rich editor** — TipTap v3 with formatting, media insertion from the library, SEO metadata, autosave, and a public-preview overlay.
- **Post management** — create, edit with title-following draft slugs, soft-delete / restore / purge, bulk operations, draft ↔ published toggle.
- **AI writing** — streamed post generation from your saved writing style, and repurposing into Twitter / LinkedIn / Instagram / Reels copy.
- **Media library** — direct presigned R2 uploads, optimized image/video previews, search, reuse in posts, and reference-safe deletion.
- **Settings** — day/night/system appearance, accent and card tint, model and writing profile, CORS allowlist, publishing toggles, and Umami share URL. Storage bindings are read from the environment.
- **Analytics** — Umami share-URL dashboard.
- **Dashboard** — writing stats, a 12-week activity heatmap, writing rhythm, and recent/continue-writing shortcuts.
- **Public JSON API** — CORS-gated published-post feed at `/api/posts` and `/api/posts/$slug`.
- **Auth** — OAuth (GitHub + Google) only. The first person to sign in claims ownership; that owner may return, but a different user cannot join.
- **Command palette** + keyboard shortcuts in the authenticated shell.
- **Live demo** — a no-signup sandbox at `/demo` with sample data, an interactive editor, simulated repurposing, a sample analytics view, and the full settings form; nothing is saved.

## Branding and appearance

The shared PageOwl mark is `src/components/shared/page-owl-logo.tsx`. Marketing, login, and owner navigation use it through the shared logo components. The public favicon is `public/favicon.svg`, with PNG, ICO, and Apple/PWA fallbacks in `public/`; update all of them when changing the mark. The footer animation starts when its logo enters the viewport and respects reduced-motion preferences.

The palette lives in `src/styles.css` (`--pageowl-*`, `--brand`, and semantic surface/text tokens). Day is the default for new appearances; the public header can switch between day and night, and an owner can set the theme, accent, and card tint in Settings. Saved choices persist. The marketing product preview intentionally keeps PageOwl's blue brand palette even when an owner selects another dashboard accent.

Migration `0008_sad_roland_deschain.sql` changes the accent and theme database defaults and updates the former violet accent to blue. It preserves existing saved theme choices, including night mode; owners who deliberately chose the old violet swatch can select it again in Settings. It was applied to remote D1 on 2026-09-23; run local or remote migrations through the documented D1 commands before deploying a version that depends on them, since pushing code does not migrate the live database.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | TanStack Start (TanStack Router SSR) |
| Styling | Tailwind CSS v4 + shadcn |
| DB / ORM | Drizzle ORM with Cloudflare D1 |
| Auth | better-auth (OAuth) |
| Editor | TipTap v3 + lowlight |
| AI | OpenRouter (chat completions) |
| Media | Cloudflare R2 (presigned uploads) |
| Analytics | Umami |
| Deploy | Cloudflare Workers (`wrangler`) |
| Tooling | Biome, Vitest, Vite 8, React Compiler |

## Prerequisites

- Bun 1.4+
- OAuth apps for **GitHub** and **Google**
- A **Cloudflare R2** bucket (for media) — optional in dev
- An **OpenRouter** API key (for AI features)

## Setup

To create a fresh project from the versioned [GitHub Packages scaffold CLI](./packages/create-pageowl/README.md), run `create-pageowl my-pageowl`. The CLI clears this repository's live D1 ID from the generated config before you provision your own database. You can also download a tagged source archive from [Releases](https://github.com/iamparmjeet/PageOwl/releases); when using a source archive directly, replace the D1 ID in `wrangler.jsonc` before deploying.

1. **Install dependencies**

   ```bash
   bun install
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
   bun run db:migrate    # apply checked-in migrations to local D1 (Wrangler)
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
5. **Media** — the Media page lists ready uploads with optimized previews, search, and insertion into posts.
6. **Settings** — configure appearance, default model, writing style, CORS origins for the public feed, and Umami.
7. **Public feed** — published posts are served as JSON at `/api/posts` (CORS-restricted by your allowlist) for external consumption.

## Project Structure

```
src/
  db/                 Drizzle schema + client (full-schema merges app + auth)
  routes/             TanStack Start routes (_public, _protected, api)
  components/         Shared UI and owner navigation
  features/           Domain logic and page components
  lib/                auth, session, r2, ai, env
  styles.css          Tailwind / global CSS and brand tokens
  db/drizzle/         Regenerated baseline migrations
```

## Known Gaps & TODO

These remain open or require manual setup:

- **Deployment** — provision D1/R2 and secrets as described in [docs/deploy.md](./docs/deploy.md); run `bun run deploy:check` before deploying and apply pending migrations separately.
- **Comments** — no comments table or UI; [the policy](./docs/decisions/0002-comments-policy.md) keeps them out of v1.
- **Accessibility audit** — the landing page had an initial pass and the 2026-09-23 marketing follow-up fixed mobile navigation, contrast, setup copy, and the mobile product preview; a full accessibility and responsive-design audit is still pending.

## License

See [LICENSE](./LICENSE).
