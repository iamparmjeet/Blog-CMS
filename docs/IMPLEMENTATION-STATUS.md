# Implementation Status

**Assessed:** 2026-09-20

This baseline is based on the current tracked source, README commitments, and local verification. It is not a product specification; `docs/ROADMAP.md` is the implementation plan.

## Summary

ContentOS has a usable visual shell and early server-side foundations, but it is not yet a functional CMS. The project is approximately **20% complete** against the feature set described in `README.md`.

| Area | Status | Current state |
| --- | --- | --- |
| Marketing site | Implemented | Landing sections include hero, repurpose, how-it-works, open-source callout, and final CTA. The decorative product mock is responsive, `aria-hidden`/`inert`, and motion respects reduced-motion preferences. |
| Application shell | Implemented | Protected routes render a persistent owner shell: sidebar navigation (Dashboard, Posts, Media, Analytics, Settings), command palette (⌘K), keyboard-shortcuts overlay (⌘?), `G`-chord navigation, account footer with sign-out, and a mobile navigation drawer. The manifest, SVG favicon, and shared brand mark use the ContentOS identity. |
| Authentication | Partial | OAuth configuration, session helpers, and a protected route exist. The owner can always sign in (welcome-back login); a second distinct user is rejected by the server hook and an atomic database constraint, then returned to the claimed-instance login state. |
| Ownership model | Partial | D2 settled: owner return allowed, second distinct user rejected. First-claim / owner-return / rejection covered by unit + throwaway-DB integration tests; the database invariant also prevents concurrent second claims. |
| Database model | Partial | Tables exist for settings, posts, media, and writing activity, and server code reaches them through a per-request `drizzle-orm/d1` client. Posts enforce valid lifecycle statuses and per-owner slug uniqueness; local and remote D1 databases can be inspected through Drizzle Studio. |
| Dashboard | Partial | The dashboard is rebuilt on the ContentOS UI kit: greeting header, four stat cards, continue-writing and writing-rhythm cards derived from real activity, the 12-week heatmap, and recent posts. Stats, streak, and rhythm derivations are unit-tested. |
| Post editing | Implemented | The owner-scoped posts list creates drafts and opens a TipTap editor at `/posts/$postId`. The editor autosaves canonical JSON with browser-local recovery; it persists validated title, stable slug, SEO metadata, and a full-screen public preview; the server derives word counts and records only positive additions. The toolbar publishes and unpublishes through the lifecycle API, and the sidebar mirrors the open post's status, word count, and read time. Owner-authorized bulk controls publish, unpublish, archive, restore archived drafts, soft-delete, restore from trash, and permanently purge posts after confirmation. |
| Page UI shells | In progress | Dashboard and Posts are rebuilt on the ContentOS UI kit with real data. `/media`, `/analytics`, and `/settings` render full reference-faithful layouts over clearly-labelled sample data; their persistence and API wiring land with M3.2, M4.3, and M4.1. |
| Media | Schema only | Media metadata and R2 environment variables exist; no upload, storage, or library behavior exists. |
| AI writing | Not implemented | No OpenRouter configuration or generation/repurposing flow exists. |
| Settings | Schema only | Preference fields exist without an owner-facing settings workflow. |
| Analytics | Schema only | An Umami share URL field exists without an analytics page or integration. |
| Public API | Not implemented | Only the Better Auth API route exists; published-post feed routes are absent. |
| Comments | Not implemented | No comment model or UI exists. |
| Scheduling | Schema only | Posts store `scheduledAt`, but no schedule-management UI or Worker promotion exists. |
| Deployment | Partial | D1 (`DB`) and R2 (`MEDIA`) bindings are declared, and the app plus better-auth run on `drizzle-orm/d1` with local development on workerd and local D1. The committed D1 identifier is still a placeholder and no preview deployment exists yet (T1.4). |

## Verified Baseline

| Check | Result | Notes |
| --- | --- | --- |
| `bun run build` | Passes | Generates a client and Worker bundle; the runtime resolves the D1 binding instead of native SQLite. |
| `bun run test` | Passes | 63/63, including canonical-body, metadata validation, positive-only writing-activity, owner-scoped lifecycle actions, dashboard stat/streak/rhythm derivations, post-editor owner-scoping, post-status, slug-constraint, and owner-claim cases. |
| `bun run check-types` | Passes | 0 errors. |
| `bun run check` | Passes | Biome 2.4.5 clean on 139 files; config migrated, 5 suppressions with written reasons. |
| `bunx wrangler types --check` | Passes | `worker-configuration.d.ts` matches the declared `DB` and `MEDIA` bindings. |
| pre-push hooks | Enforcing | lefthook: `biome-changed` ✔, `typecheck` ✔, and `production-build` ✔ on main pushes. No bypass needed since T0.3. |
| CI (main-only) | Green | `push→main` + `pull_request→main`; first green run (`35377014193`) after the T0 stack merged and `lefthook` was declared as a devDependency. |

## Immediate Repair Scope

The T0 baseline repair is complete; M1.1/T1.2/T1.3 and M2.1-M2.6 are complete. Local/remote Studio workflows and application identity are also implemented:

- The Drizzle journal is a single regenerated baseline from `full-schema.ts`; the `todos` scaffold table is gone and the baseline applies from an empty local D1 (`0000_small_scourge.sql`).
- `bun run db:migrate` now applies through Wrangler (`wrangler d1 migrations apply`); `drizzle-kit` generates SQL only.
- `/posts` lists the owner's non-deleted posts and creates untitled drafts. The posts schema includes description plus publish/schedule timestamps, rejects invalid lifecycle statuses and duplicate owner slugs, and archives invalid legacy statuses during migration.
- `/posts/$postId` is owner-scoped and renders the TipTap editor. It persists canonical JSON with debounced, serialized autosaves and local recovery; word count is derived server-side and writing activity remains positive-only.
- Post metadata validates title and stable slugs, enforces per-owner uniqueness, persists separate SEO title/description fields, and renders an in-place public preview from the canonical body.
- Post lifecycle controls are owner-authorized and batch-capable: draft posts publish, published posts unpublish to drafts, posts can be archived or returned to drafts, soft-deleted posts move to a separate trash collection, and only trashed posts can be restored or permanently purged after explicit confirmation. Once a post has been published, its slug stays immutable across later status changes.
- Remaining before deployment: T1.4 deploy verification (authenticate with Wrangler OAuth, provision D1/R2, replace the placeholder database ID, apply remote migrations, preview smoke).

## Local Worker State

- Cloudflare's Vite plugin can deadlock during Worker export initialization when it persists Miniflare SQLite state under this repository's Btrfs-backed `.wrangler/state` directory.
- `vite.config.ts` uses the plugin's supported `persistState.path` option to store local Worker state under `$XDG_RUNTIME_DIR/contentos-wrangler-state`, falling back to `/tmp/contentos-wrangler-state`. Set `CLOUDFLARE_LOCAL_STATE_PATH` to override the location.
- `bun run db:migrate` uses the same state path as Vite. The runtime directory is cleared after reboot, so run the migration command before starting the dev server in a new session.
- `bun run db:studio:local` discovers the non-metadata SQLite file in that state directory and opens it with Drizzle Studio. `bun run db:studio:remote` uses the D1 HTTP API with `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_D1_DATABASE_ID`, and a scoped `CLOUDFLARE_API_TOKEN`.

## UI Shell Pass (2026-09-20)

Branch `feat/m2.6-app-shell` rebuilds the protected area on the ContentOS UI kit ported from the `Blog-CMS-ai` and `Blog-CMS-claude` references:

- `.dark` tokens are aligned to the reference palette (`#0a0a0a` app, `#0d0d0d` card, `#1f1f1f` border, `#e5e5e5`/`#d4d4d4`/`#a3a3a3`/`#737373` text ramp) with three added text tokens (`--text-body`, `--text-soft`, `--accent-soft`).
- `src/components/content-os/ui.tsx` provides `StatusBadge`, `Kbd`, `SectionLabel`, `SegmentedControl`, `UserAvatar`, `AccentSwitch`, `PageHeader`, and `EmptyState`.
- `src/components/content-os/sidebar.tsx` provides the owner navigation, editor post context with publish switch and schedule picker, and the account footer with sign-out; `sidebar-context.tsx` lets the editor publish the open post into the shell.
- `src/components/content-os/command-palette.tsx` provides the ⌘K palette and the shortcuts overlay; `_protected.tsx` registers ⌘K, ⌘?, ⌘N, `G`-chords, and Escape.
- The dashboard is rebuilt with real data (stat cards, continue/rhythm cards, heatmap, recent posts) and the posts list uses the reference toolbar, filter tabs, bulk bar, table, and footer stats.
- `/media`, `/analytics`, and `/settings` render the reference layouts over clearly-labelled sample data so navigation is complete before their data milestones.
- The editor gains the reference toolbar (breadcrumb, save state, Write/SEO, Draft/Published toggle, preview, trash), a character-counted SEO tab with a search preview, a light full-screen preview overlay (⌘⇧V), and explicit `immediatelyRender: false` for SSR-safe TipTap mounting.

## Marketing Page Pass (2026-09-19)

The landing page was reviewed against the design and React guidelines, then merged into `feat/m2.3-rich-editor` as `27736a0`:

- Replaced the fabricated "Alex Morgan" testimonial with an honest open-source callout (`src/features/marketing/open-source-section.tsx`): MIT/self-host meta, real repository link, and a self-host terminal snippet. `quote-section.tsx` was removed.
- Rebuilt the final CTA as a bordered panel with an accent glow instead of a bare centered block.
- Removed invalid nested interactive markup (`<button>` wrapping links) by styling router and native links with `buttonVariants`; CTA labels are unified to one intent each.
- Fixed landing defects: `text-zince-500` typo, duplicate React keys in the repurpose mock, the dead `/why-i-diteched-notion` slug, placeholder GitHub links, and a raw `<a href="/dashboard">` full reload.
- Header scroll state now uses Motion `useScroll`/`useMotionValueEvent` instead of a `window` scroll listener.
- The decorative dashboard mock is responsive and no longer focusable or announced (`aria-hidden` + `inert`); its dead `useState` was removed.
- Reduced motion is respected for the platform rotation, mock float, and typing caret.

Not addressed in this pass: full accessibility audit, light-mode support, and deferred section-layout/eyebrow diversification.

## Tooling (added 2026-09-18)

- `AGENTS.md` (131 words, WDS-style) + `CLAUDE.md` symlink; links `@CONTEXT.md`, `@COMMITS.md`, roadmap/plan/status, delivery conventions.
- `COMMITS.md` + commitlint + lefthook (`pre-commit` biome, `commit-msg` lint, `pre-push` typecheck/lint/build). Scripts: `check-types`, `check` (`biome check .`), `check:fix`.
- `lefthook` declared as a devDependency (`3482c00`); the `prepare` script previously relied on a machine-global binary, which failed CI installs.
- `.github/workflows/ci.yml` (main-only triggers), `.release-it.json` (`npm.publish:false`), `opencode.jsonc` (playwright), `.opencode/commands/verify.md`.
- Hygiene commits: `de89bb0`/`6bd8d01` chore(tooling), `21fbd40` docs(agent). `dev.db` untracked, `.cursorrules` removed.

## Documentation Caveat

The README describes a much more complete product than the source implements. The migration warning it carried is resolved: T1.3 regenerated a single clean baseline, so the missing `0004` journal entry no longer applies.
