# Implementation Status

**Assessed:** 2026-09-22

This baseline is based on the current tracked source, README commitments, and local verification. It is not a product specification; `docs/ROADMAP.md` is the implementation plan.

## Summary

ContentOS now supports the core owner post workflow, direct managed-media uploads, and the first settings-backed appearance slice (schema, owner-scoped server functions, and a client appearance module). Public delivery, deployment verification, the settings UI wiring, analytics, AI assistance, scheduling, and optional community features remain incomplete.

| Area | Status | Current state |
| --- | --- | --- |
| Marketing site | Implemented | Landing sections include hero, repurpose, how-it-works, open-source callout, and final CTA. The decorative product mock is responsive, `aria-hidden`/`inert`, and motion respects reduced-motion preferences. |
| Application shell | Implemented | Protected routes render a persistent owner shell: sidebar navigation (Dashboard, Posts, Media, Analytics, Settings), command palette (⌘K), keyboard-shortcuts overlay (⌘?), `G`-chord navigation, account footer with sign-out, and a mobile navigation drawer. The manifest, SVG favicon, and shared brand mark use the ContentOS identity. |
| Authentication | Partial | OAuth configuration, session helpers, and a protected route exist. The owner can always sign in (welcome-back login); a second distinct user is rejected by the server hook and an atomic database constraint, then returned to the claimed-instance login state. |
| Ownership model | Partial | D2 settled: owner return allowed, second distinct user rejected. First-claim / owner-return / rejection covered by unit + throwaway-DB integration tests; the database invariant also prevents concurrent second claims. |
| Database model | Partial | Tables exist for settings, posts, media, and writing activity, and server code reaches them through a per-request `drizzle-orm/d1` client. Posts enforce valid lifecycle statuses and per-owner slug uniqueness; local and remote D1 databases can be inspected through Drizzle Studio. |
| Dashboard | Partial | The dashboard is rebuilt on the ContentOS UI kit: greeting header, four stat cards, continue-writing and writing-rhythm cards derived from real activity, the 12-week heatmap, and recent posts. Stats, streak, and rhythm derivations are unit-tested. |
| Post editing | Implemented | The owner-scoped posts list creates drafts and opens a TipTap editor at `/posts/$postId`. The editor autosaves canonical JSON with browser-local recovery; it persists validated title, stable slug, SEO metadata, and a full-screen public preview; the server derives word counts and records only positive additions. The toolbar publishes and unpublishes through the lifecycle API, and the sidebar mirrors the open post's status, word count, and read time. Owner-authorized bulk controls publish, unpublish, archive, restore archived drafts, soft-delete, restore from trash, and permanently purge posts after confirmation. |
| Page UI shells | In progress | Dashboard and Posts use real data. `/media` now uploads to R2 and lists ready owner assets with image/video previews; `/analytics` and `/settings` remain reference layouts over clearly-labelled sample data until M4.3 and M4.1. |
| Media | Partial (M3.1 complete) | The owner can upload validated images and videos directly to R2 through five-minute presigned URLs. Pending D1 metadata becomes ready only after R2 size/type verification, ready assets survive refreshes and render in the media grid, and immutable object URLs receive long-lived cache metadata. Search, editor insertion, deletion policy, and optimized thumbnail variants remain M3.2. |
| AI writing | Not implemented | No OpenRouter configuration or generation/repurposing flow exists. |
| Settings | Partial (M4.1 in progress) | The `settings` table stores `themeMode` (default `night`) and `surfaceTint`; appearance is loaded on protected routes, applied live from the settings UI, and persisted through owner-scoped server functions. The settings page is tabbed (Appearance, Account, Site, Publishing, Storage) — Appearance is fully wired; the broader form still has unconnected storage fields (bucket/bucketName mismatch, omitted timeZone). |
| Analytics | Schema only | An Umami share URL field exists without an analytics page or integration. |
| Public API | Not implemented | Only the Better Auth API route exists; published-post feed routes are absent. |
| Comments | Not implemented | No comment model or UI exists. |
| Scheduling | Schema only | Posts store `scheduledAt`, but no schedule-management UI or Worker promotion exists. |
| Deployment | Partial | D1 (`DB`) and R2 (`MEDIA`) bindings are declared; local development uses local D1 and the remote `contentos` R2 bucket for the direct-upload verification path. The committed D1 identifier is still a placeholder and no preview deployment exists yet (M1.3). |

## Verified Baseline

| Check | Result | Notes |
| --- | --- | --- |
| `bun run build` | Passes | Generates a client and Worker bundle; the runtime resolves the D1 binding instead of native SQLite. |
| `bun run test` | Passes | 84/84, including media validation/key/URL rules, owner-scoped pending/ready metadata transitions, canonical-body, metadata validation, positive-only writing activity, lifecycle actions, dashboard derivations, post-editor owner-scoping, post-status, slug-constraint, and owner-claim cases. |
| `bun run check-types` | Passes | 0 errors. |
| `bun run check` | Passes | Biome 2.4.5 clean on 148 files; config migrated, 5 suppressions with written reasons. |
| `bunx wrangler types --check` | Passes | `worker-configuration.d.ts` matches the declared `DB` and `MEDIA` bindings. |
| pre-push hooks | Enforcing | lefthook: `biome-changed` ✔, `typecheck` ✔, and `production-build` ✔ on main pushes. No bypass needed since T0.3. |
| CI (main-only) | Green | `push→main` + `pull_request→main`; first green run (`35377014193`) after the T0 stack merged and `lefthook` was declared as a devDependency. |

## Immediate Repair Scope

The T0 baseline repair, M1.1-M1.2, M2.1-M2.6, and M3.1 are complete. Local/remote Studio workflows and application identity are also implemented:

- The Drizzle journal is a single regenerated baseline from `full-schema.ts`; the `todos` scaffold table is gone and the baseline applies from an empty local D1 (`0000_small_scourge.sql`).
- `bun run db:migrate` now applies through Wrangler (`wrangler d1 migrations apply`); `drizzle-kit` generates SQL only.
- `/posts` lists the owner's non-deleted posts and creates untitled drafts. The posts schema includes description plus publish/schedule timestamps, rejects invalid lifecycle statuses and duplicate owner slugs, and archives invalid legacy statuses during migration.
- `/posts/$postId` is owner-scoped and renders the TipTap editor. It persists canonical JSON with debounced, serialized autosaves and local recovery; word count is derived server-side and writing activity remains positive-only.
- Post metadata validates title and stable slugs, enforces per-owner uniqueness, persists separate SEO title/description fields, and renders an in-place public preview from the canonical body.
- Post lifecycle controls are owner-authorized and batch-capable: draft posts publish, published posts unpublish to drafts, posts can be archived or returned to drafts, soft-deleted posts move to a separate trash collection, and only trashed posts can be restored or permanently purged after explicit confirmation. Once a post has been published, its slug stays immutable across later status changes.
- Media uploads use server-generated `aws4fetch` signatures, direct browser `PUT` requests, immutable owner-scoped keys, pending-to-ready D1 metadata, remote R2 verification, cancellation cleanup, owner-only listing, lazy previews with failure fallbacks, authenticated metadata `no-store`, and one-year immutable object cache metadata.
- Remaining before deployment: M1.3 deploy verification (authenticate with Wrangler OAuth, provision D1/R2, replace the placeholder database ID, apply remote migrations, preview smoke).

## Current Handoff

The merged product baseline is `5c730f7`, where PR #12 squash-merged M3.1. Continue each next concern from a separate fresh branch based on current `main`:

- An in-progress appearance/settings slice (M4.1 partial) is uncommitted on `fix/dashboard-visual-refresh`: the `settings` schema columns, the `0003_acoustic_karnak.sql` migration, `src/features/settings/appearance.ts`, and `src/features/settings/functions/*`. Route/UI wiring (root no-flash theme bootstrap, protected-route appearance load, tabbed settings controls, flat-surface CSS tokens, dashboard/editor/login token swaps) is not done. See the appearance pass section below.
- The next unstarted product slice is M3.2: media search, editor insertion and reuse, safe deletion, and generated image/video thumbnail variants.
- M1.3 remains incomplete on `main`. Commit `c596f3e` is preserved on `origin/feat/m1.3-remote-d1`; review it by cherry-picking it onto a fresh branch, then complete documentation cleanup and an authenticated preview-deployment smoke test.
- Keep each independent concern (appearance/settings, frontend repair, M3.2, M1.3) on its own fresh branch. Do not absorb M3.2 scope into the appearance branch.

## Local Worker State

- Cloudflare's Vite plugin can deadlock during Worker export initialization when it persists Miniflare SQLite state under this repository's Btrfs-backed `.wrangler/state` directory.
- `vite.config.ts` uses the plugin's supported `persistState.path` option to store local Worker state under `$XDG_RUNTIME_DIR/contentos-wrangler-state`, falling back to `/tmp/contentos-wrangler-state`. Set `CLOUDFLARE_LOCAL_STATE_PATH` to override the location.
- `bun run db:migrate` uses the same state path as Vite. The runtime directory is cleared after reboot, so run the migration command before starting the dev server in a new session.
- `bun run db:studio:local` discovers the non-metadata SQLite file in that state directory and opens it with Drizzle Studio. `bun run db:studio:remote` uses the D1 HTTP API with `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_D1_DATABASE_ID`, and a scoped `CLOUDFLARE_API_TOKEN`.

## Settings & Appearance Pass (2026-09-22)

Branch `fix/dashboard-visual-refresh` completes the M4.1 appearance slice wiring.

- `src/db/schema.ts` adds `themeMode` (`text`, not null, default `night`) and nullable `surfaceTint` to `settings`. Migration `src/db/drizzle/0003_acoustic_karnak.sql` applies `ALTER TABLE settings ADD theme_mode ...` and `ADD surface_tint ...`; it was generated with `bun run db:generate` and applied locally with `bun run db:migrate` (3 commands executed successfully).
- `src/features/settings/settings.types.ts` extends `SettingsForm`/`DEFAULT_SETTINGS` and adds `ThemeMode` (`system | day | night`), `AppearanceSettings`, and `DEFAULT_APPEARANCE` (`night`, `#7c3aed`, empty tint).
- `src/features/settings/appearance.ts` is the client appearance contract: `APPEARANCE_STORAGE_KEY` (`contentos-appearance`), cache read/write, `normalizeAppearance`, `applyAppearance` (toggles `.dark` on `documentElement`, sets `--brand` and `--surface-tint`, and tracks `prefers-color-scheme` for `system` mode with listener cleanup), plus `APPEARANCE_BOOTSTRAP_SCRIPT` for no-flash head injection.
- `src/features/settings/functions/` adds the owner-scoped read/write path: `appearanceInputSchema` validates the theme enum, a `#rrggbb` accent, and an empty-or-hex tint; `readAppearance`/`upsertAppearance` use the `settings.userId` conflict target; server and server-function wrappers require a session and return `Cache-Control: no-store`.
- `__root.tsx` drops the hardcoded `<html className="dark">` and injects the bootstrap script before first paint (`suppressHydrationWarning` on `<html>`). `_protected.tsx` loads appearance in `beforeLoad` and applies it in an effect; `_protected/settings.tsx` passes it into the page.
- The settings page is tabbed (Appearance, Account, Site, Publishing, Storage). Appearance controls (theme segmented control, AccentPicker, surface-tint picker) apply live via `setAppearance` and persist through `saveAppearanceSettings`; the header Save button is scoped to that appearance slice.
- `styles.css` adds `--surface-tint`, `--flat-surface` (`color-mix` of card + 8% tint), and editor code tokens; dashboard and shared `bg-card` surfaces swap to `bg-flat-surface`; editor ProseMirror/editor-content and login hardcoded hexes swap to theme tokens for day mode.
- Unit coverage: `src/features/settings/appearance.test.ts` (normalize, cache round-trip, bootstrap script shape).

## UI Shell Pass (2026-09-20)

Branch `feat/m2.6-app-shell` rebuilds the protected area on the ContentOS UI kit ported from the `Blog-CMS-ai` and `Blog-CMS-claude` references:

- `.dark` tokens are aligned to the reference palette (`#0a0a0a` app, `#0d0d0d` card, `#1f1f1f` border, `#e5e5e5`/`#d4d4d4`/`#a3a3a3`/`#737373` text ramp) with three added text tokens (`--text-body`, `--text-soft`, `--accent-soft`).
- `src/components/content-os/ui.tsx` provides `StatusBadge`, `Kbd`, `SectionLabel`, `SegmentedControl`, `UserAvatar`, `AccentSwitch`, `PageHeader`, and `EmptyState`.
- `src/components/content-os/sidebar.tsx` provides the owner navigation, editor post context with publish switch and schedule picker, and the account footer with sign-out; `sidebar-context.tsx` lets the editor publish the open post into the shell.
- `src/components/content-os/command-palette.tsx` provides the ⌘K palette and the shortcuts overlay; `_protected.tsx` registers ⌘K, ⌘?, ⌘N, `G`-chords, and Escape.
- The dashboard is rebuilt with real data (stat cards, continue/rhythm cards, heatmap, recent posts) and the posts list uses the reference toolbar, filter tabs, bulk bar, table, and footer stats.
- `/media`, `/analytics`, and `/settings` render the reference layouts over clearly-labelled sample data so navigation is complete before their data milestones.
- The editor gains the reference toolbar (breadcrumb, save state, Write/SEO, Draft/Published toggle, preview, trash), a character-counted SEO tab with a search preview, a light full-screen preview overlay (⌘⇧V), and explicit `immediatelyRender: false` for SSR-safe TipTap mounting.

## R2 Upload Pass (2026-09-21)

PR #12 (`5c730f7`) completes the M3.1 storage slice and starts the visible ready-asset surface needed by M3.2:

- Upload initiation, completion, and cancellation are authenticated server functions. Validation accepts GIF, JPEG, PNG, WebP, MP4, and WebM files up to 50 MB; filenames and owner-scoped UUID object keys are sanitized before signing.
- The browser uploads directly to the remote `contentos` bucket through a five-minute presigned `PUT`. Credentials remain server-side; completion verifies R2 object size and content type before changing D1 metadata from `pending` to `ready`.
- `/media` loads only the signed-in owner's non-deleted ready rows, inserts a completed upload immediately, and preserves it across refreshes. Images and muted video previews lazy-load from the configured public R2 URL and fall back to type icons on load failure.
- Authenticated list responses use `Cache-Control: no-store` and vary by cookie/authorization. New immutable R2 objects carry `Cache-Control: public, max-age=31536000, immutable`; a production custom domain and cache rule are still required for managed Cloudflare edge caching.
- M3.2 remains responsible for search, editor insertion/reuse, safe deletion behavior, and generated thumbnail/poster variants so the grid does not depend on full-size originals.

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
