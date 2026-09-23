# Implementation Status

**Assessed:** 2026-09-23

This baseline is based on the current tracked source, README commitments, and local verification. It is not a product specification; `docs/ROADMAP.md` is the implementation plan.

## Summary

ContentOS now supports the core owner post workflow, a complete owner media library (direct R2 uploads with verified generated preview variants, search, editor insertion/reuse, and reference-safe deletion), a CORS-gated public JSON feed of published posts, an RSS feed gated by its toggle, the settings-backed appearance slice, the complete owner settings form (identity, timezone, model, writing profile, publishing toggles, Umami URL, env-backed storage readout), the owner-only Umami analytics surface, and streamed AI draft generation from the saved writing profile, per-format social repurposing with explicit copy, timezone-aware scheduled publishing promoted by a Worker cron, and local backup export/import with Merge and Replace. Optional community features remain incomplete.

| Area | Status | Current state |
| --- | --- | --- |
| Marketing site | Implemented | Landing sections include hero, repurpose, how-it-works, open-source callout, and final CTA. The decorative product mock is responsive, `aria-hidden`/`inert`, respects reduced-motion preferences, and shows the repurpose panel on mobile. The PageOwl mark appears in the header and footer; the footer starts animating on entry. The public mobile menu opens and closes accessibly, brand buttons pick a contrast-safe foreground for any saved accent, day-mode muted text and the hero gradient meet contrast, and the setup snippet and CTAs point to real self-host steps. A public `/demo` sandbox renders the real dashboard, posts list, and editor with sample data and simulated repurposing; the header nav, hero, and login page link to it. |
| Application shell | Implemented | Protected routes render a persistent owner shell: sidebar navigation (Dashboard, Posts, Media, Analytics, Settings), command palette (⌘K), keyboard-shortcuts overlay (⌘?), `G`-chord navigation, account footer with sign-out, and a mobile navigation drawer. The visible logo, favicon, PWA icons, and page titles use PageOwl; backup and some internal ContentOS identifiers retain compatibility. |
| Authentication | Partial | OAuth configuration, session helpers, and a protected route exist. The owner can always sign in (welcome-back login); a second distinct user is rejected by the server hook and an atomic database constraint, then returned to the claimed-instance login state. |
| Ownership model | Partial | D2 settled: owner return allowed, second distinct user rejected. First-claim / owner-return / rejection covered by unit + throwaway-DB integration tests; the database invariant also prevents concurrent second claims. |
| Database model | Partial | Tables exist for settings, posts, media, and writing activity, and server code reaches them through a per-request `drizzle-orm/d1` client. Posts enforce valid lifecycle statuses and per-owner slug uniqueness; local and remote D1 databases can be inspected through Drizzle Studio. |
| Dashboard | Implemented (M4.2) | The dashboard uses the shared owner UI kit and PageOwl sidebar mark: time-zone-aware greeting header, four stat cards linking to tab-filtered post workflows, continue-writing and writing-rhythm cards derived from real activity, the week-aligned 12-week heatmap, and recent posts. Stats, streak, rhythm, heatmap, dashboard query, and page-state derivations are unit-tested; `/posts` tab search is optional with an `all` fallback. |
| Post editing | Implemented | The owner-scoped posts list creates drafts, searches title/slug/description/body text server-side from a debounced toolbar input, and opens a TipTap editor at `/posts/$postId`. The editor autosaves canonical JSON with browser-local recovery; it persists validated title, SEO metadata, and a full-screen public preview; drafts derive their slug from the title while it is untouched (collision-suffixed against every owner slug, including trashed rows), a manual slug edit stops the follow, and the slug freezes once the post has ever been published; the server derives word counts and records only positive additions. The toolbar publishes and unpublishes through the lifecycle API, and the sidebar mirrors the open post's status, word count, and read time. Owner-authorized bulk controls publish, unpublish, archive, restore archived drafts, soft-delete, restore from trash, and permanently purge posts after confirmation. |
| Page UI shells | In progress | Dashboard and Posts use real data. `/media` uploads to R2 and lists ready owner assets with search and optimized previews; `/settings` Appearance, Site identity, Account, Publishing preferences, Publishing toggles, Umami URL, env-backed Storage readout, Public JSON feed allowlist, and Danger zone backup export/restore are wired; Integrations and Delete account remain reference layouts. `/analytics` resolves the owner Umami config (M4.3). `/rss` serves the enabled RSS feed. |
| Media | Implemented (M3.1 + M3.2) | The owner uploads validated images and videos directly to R2 through five-minute presigned URLs; pending metadata becomes ready only after size/type verification of the original and its generated preview variant. The library supports filename search, kind filters, and previews that prefer generated image thumbnails and video poster variants over full originals. Assets insert and reuse across posts from the editor's media picker, and deletion is reference-scanned: published or scheduled posts block deletion, other references require explicit confirmation, and unreferenced assets remove their R2 objects and row. |
| AI writing | Implemented (T5.1 generation) | The editor header has a Generate action opening a review dialog: prompt input, streamed output with cancel, model readout from `x-ai-model`, and explicit Insert-into-editor / Discard. `POST /api/ai/generate` and `POST /api/ai/repurpose` (owner session) stream OpenRouter chat completions steered by the saved writing profile (`writingStyle`, `writingSample`, `defaultModel` fallback). Generation never writes to the database — provider failures, aborts, and missing keys leave the draft untouched and nothing auto-publishes. Owner AI routes share a per-user budget (10/min each) against OpenRouter spend; overspending answers 429 before any provider call. Requires the optional `OPENROUTER_API_KEY` secret; unconfigured instances get setup guidance. The repurpose rail generates per-format variants (Twitter thread, LinkedIn post, Instagram caption, Reels script) from the open post's text with the same streaming/cancel/error behavior, labels each variant by its target format, and copies through an explicit Copy action — repurposing is read-only server-side, so the source post is never mutated. |
| Settings | Implemented (M4.1) | The `settings` table stores appearance, identity, timezone, model, writing profile, publishing toggles, Umami URL, and CORS origins; each group has validated owner-scoped read/write server functions and per-section Save buttons in the settings UI. Appearance loads on protected routes and applies live. Storage config is read-only from `R2_*` env (source of truth for media uploads). Publishing toggles persist and are consumed: `seoMeta` gates SEO fields in the JSON feed, `readingTime` adds `readingTimeMinutes` to feed posts, and `rssFeed` gates the `/rss` endpoint. Model/writing profile are consumed by T5.1 generation. Umami share URL is consumed by M4.3. |
| Analytics | Implemented (M4.3) | The owner-only `/analytics` route loads `settings.umamiShareUrl` (plus optional server `UMAMI_URL` fallback) through a `no-store` session-scoped server function. Unconfigured instances get a setup empty state linking to Settings → Publishing → Umami analytics; an https share URL embeds in an iframe with an external-link fallback (frame errors degrade to a new-tab link); non-https or env-only configs render an external link only. No demo data remains, no public analytics route exists, and API credentials never leave the server (the share-URL path is used, not the Umami API). |
| Public API | Implemented (M3.3 + M4.1) | `GET /api/posts` and `GET /api/posts/:slug` serve owner-published posts as JSON behind a settings-driven CORS allowlist. Allowed origins receive the documented payload with `Access-Control-Allow-Origin`; disallowed origins get 403 with no publishable content; drafts, scheduled, archived, and soft-deleted posts are excluded. TipTap bodies are sanitized so media/link URLs are http(s) only. The publishing toggles shape the payload: `seoMeta` off empties `seoTitle`/`description`, `readingTime` on adds `readingTimeMinutes`. `GET /rss` serves the same published posts as RSS 2.0 (XML-escaped, cached 5 minutes) and answers 404 while the `rssFeed` toggle is off. Anonymous surfaces share per-IP fixed-window budgets (100/min feed, 60/min RSS); overspending answers 429 with `Retry-After` and no content. |
| Comments | Policy decided, not built (M6.1) | ADR 0002 keeps comments out of v1: no table, no endpoints, no UI. Readers comment on the consuming site or through an external provider the owner embeds there. Any future implementation must satisfy the recorded actors, moderation states (`pending` → `approved`/`rejected`/`spam`), bot-defense + rate-limiting, and 90-day purge rules before adding a table. M6.2 stays open behind a D8 revisit. |
| Scheduling | Implemented (T5.3) | The sidebar Schedule picker persists per post: datetime-local interpreted in the owner's settings timezone, future-only, valid metadata required, unschedule returns to draft. `POST` schedule server function is owner-scoped; the Worker runs `promoteDueScheduledPosts` on a `*/5 * * * *` cron via the custom `src/server.ts` entry, flipping due `scheduled` rows to `published` exactly once (status-guarded UPDATE, coalesced `publishedAt`). |
| Backup/restore | Deployed and small Merge verified | Owner-only version-1 JSON export includes all posts, settings, activity, and R2 objects. Settings → Storage → Danger zone offers Merge or explicitly confirmed Replace; new keys, slugs, post/media IDs, and embedded references are remapped in one D1 batch. Backups over 16 MiB stream one media object per request through R2, then commit a bounded metadata manifest; migration 0007 records committed session IDs for idempotent retries. Missing originals are rejected; older v1 exports without IDs remap by URL. The live small Merge retained the existing published post and renamed a colliding draft slug; temporary posts were purged. Large-media restore remains covered by deterministic E2E rather than a live import. See `docs/backup.md` and the backup E2E artifacts. |
| Deployment | Implemented (M1.3) | D1 (`DB`) and R2 (`MEDIA`) bindings are declared; local development uses local D1 and the remote `contentos` R2 bucket for the direct-upload verification path. Remote D1 `blog-cms` (`142c33e3-399b-4eea-9164-10995ce4f115`) is provisioned through migration 0008, applied on 2026-09-23 after confirming the target account and bindings; no migrations are pending. `wrangler.jsonc` carries the real id, and `docs/deploy.md` + `bun run deploy:check` document/validate the shared preview/production flow. Manual version `866a4766-89d5-451d-b658-ea24b28c3a6d` passed the live smoke test on `https://contentos.parmjeetmishra.com` (canonical; `https://blog-cms.parmjeetmishra.workers.dev` remains for non-auth smoke checks): `/` served 200, `/dashboard` 307-redirected to login when signed out, and `/api/posts` 403ed disallowed origins. Worker boots with no native SQLite dependencies. The PageOwl identity and marketing follow-up release deployed as version `14132947-55dd-40f6-ae7a-06a1b45bbf0c` on 2026-09-23 after applying migration 0008; the same smoke test passed, and the release record is in `docs/e2e/go-live-20260923.md`. |

## Verified Baseline

| Check | Result | Notes |
| --- | --- | --- |
| `bun run build` | Passes | Generates a client and Worker bundle; the runtime resolves the D1 binding instead of native SQLite. |
| `bun run test` | Passes | 321/321, including post full-text search (title/slug/description/markup-free body, wildcard-literal, scoping), deploy binding/placeholder checks, media validation/key/URL/preview rules, owner-scoped pending/ready metadata transitions, media search and usage scanning, canonical-body, metadata validation, positive-only writing activity, lifecycle actions, dashboard derivations, week-aligned heatmap + activity levels, dashboard owner-scoped post rows, dashboard page states (empty, tab-filtered links, time-zone greeting), post-editor owner-scoping, post-status, slug-constraint, title-following slug derivation/collision-suffix/opt-out/freeze, owner-claim, appearance normalize/cache/bootstrap + brand-foreground contrast selection, card-surface controls, analytics Umami config resolution + page states, feed CORS/origin parsing/body sanitization/published-only queries, AI prompt building/model resolution/input validation, OpenRouter SSE parsing (native + normalized shapes)/error mapping, AI generation owner-scoping/not-configured/outage/abort with draft-intact guarantees, repurpose format instructions/message building, repurpose empty-source/foreign-post/outage handling with source-intact guarantees, schedule timezone conversion, schedule save/unschedule validation plus no-settings default-zone fallback, idempotent due-post promotion, fixed-window rate-limit budgets/rollover/isolation plus 429 wiring on feed/RSS/AI surfaces, settings profile schema/upsert coverage, demo sample-data builders (posts, activity rows, dashboard stats, analytics traffic, HTML word count), and backup bundle assembly/collection/download with owner scoping and missing-object tolerance. |
| `bun run check-types` | Passes | 0 errors. |
| `bun run check` | Passes | Biome 2.4.5 clean on 221 files. |
| `bunx wrangler types --check` | Passes | `worker-configuration.d.ts` matches the declared `DB` and `MEDIA` bindings. |
| pre-push hooks | Enforcing | lefthook: `biome-changed` ✔, `typecheck` ✔, and `production-build` ✔ on main pushes. No bypass needed since T0.3. |
| CI (main-only) | Green | `push→main` + `pull_request→main`; first green run (`35377014193`) after the T0 stack merged and `lefthook` was declared as a devDependency. |

## PageOwl Brand and Appearance Refresh (2026-09-23)

The visible marketing, login, and owner-navigation identity is PageOwl. The layered-page/owl SVG has page-and-blink motion in the public header and starts animating when the footer enters view; reduced-motion preferences keep it static. The mark is separate from the wordmark so its size can change independently. The former ContentOS SVG and unused Drizzle SVG were removed from `public/`; the remaining SVG, 32px PNG, ICO, Apple touch, and 192/512px PWA icons are PageOwl assets. Root head links use cache-busted icon URLs and SVG/PNG/ICO fallbacks. The public product preview follows day/night surfaces but intentionally keeps the PageOwl blue palette instead of the owner's selected accent.

Day is the default for new appearance settings, with a persistent public day/night toggle and owner appearance controls. The semantic UI tokens in `src/styles.css` drive accents and theme surfaces. Generated migration `0008_sad_roland_deschain.sql` rebuilds the settings table with day/blue defaults, preserving existing rows and explicit night selections; its targeted backfill replaces the old violet accent with blue. A user who intentionally kept violet can reselect that swatch. The `contentos-appearance` storage key and backup identity are retained for compatibility.

Local verification: browser checks confirmed the footer mark animates on entry in both themes, pauses offscreen, and resolves the linked icon files; the favicon's dark-backed mark is legible at 32px. `bun run test` (290/290), `bun run check-types`, `bun run check`, and `bun run build` pass. **Remote D1 migration 0008 is not applied by a git push**; before a deployment, use the binding/account checks in `docs/deploy.md`, apply `bun run db:migrate:remote`, and verify the migration list. The older go-live statement below that no migrations were pending describes the 0007 baseline before this change.

Remote D1 migration 0008 was applied on 2026-09-23 after confirming the target account and bindings in `docs/deploy.md`; `bunx wrangler d1 migrations list blog-cms --remote` reports no pending migrations. The migration preserved the saved night-mode choice, backfilled the legacy violet accent to PageOwl blue, and left the remaining settings values intact.

## Marketing Follow-up Pass (2026-09-23)

The marketing review follow-ups landed without touching owner or backup identifiers:

- **Mobile menu.** The header menu button (40px target) opens a disclosure panel with the section links and GitHub; it closes on Escape, after a nav link tap, and when the viewport grows past `md`. `aria-expanded`/`aria-controls` are wired and the panel is not a modal.
- **Contrast.** `brandForegroundFor` picks white or PageOwl ink by WCAG relative luminance so every accent swatch (and any legacy custom hex) keeps ≥4.5:1 button text; it is applied by `applyAppearance`, the pre-paint bootstrap script, and is unit-tested. The default accent and the marketing demo pin to PageOwl blue `#0867f2` (white text, 4.96:1); `--primary-foreground`/`--sidebar-primary-foreground` follow `--brand-foreground`; day-mode `--muted-foreground` darkened to 5.27:1 on white; the hero gradient drops its cyan start in day mode (night keeps it); and the terminal success line uses emerald-700/400.
- **Copy and setup.** The terminal shows `git clone https://github.com/iamparmjeet/blog-cms.git`, `bun install`, `bun run db:migrate:remote`, and `bun run deploy`, with a deploy-guide link. The hero and final CTAs say “Self-host it free” and point at the open-source setup section instead of owner login/dashboard.
- **Mobile product preview.** Below `sm` the mock stacks a condensed editor over the repurpose panel (tabs, Generate, thread output) so repurposing is visible; the long clone URL wraps instead of overflowing.
- **Footer.** Brand, links, and legal rows stack with container padding at mobile widths; from `sm` up, the nav is top-aligned with the logo center instead of drifting against the tagline.

Verification: `bun run test` (295/295), `bun run check-types`, `bun run check` (214 files), and `bun run build` pass. Headless-browser checks at 390px and 1280px confirmed menu open/close/Escape/link/breakpoint behavior, no horizontal overflow, the mobile repurpose panel, PageOwl-blue demo pinning under an amber owner accent (ink foreground), and the anchor CTA landing on the setup section. The pass was deployed as version `14132947-55dd-40f6-ae7a-06a1b45bbf0c` on 2026-09-23; the live smoke test and mobile checks are recorded in `docs/e2e/go-live-20260923.md`. Platform-specific dots and green success states remain intentional semantic exceptions to the blue brand palette.

## Title-Following Slug Pass (2026-09-23)

Draft URLs now track the title without breaking published links:

- `slugForTitle`/`slugFollowsTitle` (`posts.utils.ts`) derive a collision-suffixed slug from the title and decide whether the open post is still auto-following. `selectOwnerSlugsExcluding` reserves every owner slug except the open post — soft-deleted rows stay reserved because the unique index spans them, and other owners never leak.
- The editor loader (`getPostEditor`) returns `{ post, takenSlugs }`; `PostEditorData`/`PostEditorRow` carry `publishedAt` so a post that was published and later unpublished keeps its URL frozen.
- `PostEditorPage` follows the title only while the slug was never manually edited, the post has never been published, and the slug is still derived; editing the slug in the write view or SEO panel opts out permanently for the session.
- Coverage: test-first cases in `posts.utils.test.ts` (derivation, collision suffix, opt-out, published freeze, blank title) plus the deterministic E2E `scripts/auto-slug-e2e.ts` → `docs/e2e/auto-slug.log`. Browser checks against a local owner session confirmed auto-follow, opt-out, collision suffixing (`auto-slug-probe-2`), and the published/previously-published freeze.

## Live Demo Sandbox (2026-09-23)

A no-signup sandbox at `/demo` renders the real owner surfaces with sample data, entirely client-side:

- `demo-data.ts` builds deterministic sample posts and a 12-week activity heatmap through the real dashboard derivations; `countWordsInHtml` keeps stored and live word counts consistent. Covered test-first in `demo-data.test.ts`.
- The sandbox shell switches between Dashboard, Posts, Editor, Analytics, and Settings views; only Media remains an honest placeholder. Dashboard stat cards, continue/recent rows, and the new-draft button accept optional demo handlers, so production pages keep their router links.
- Analytics renders labeled sample traffic (visitors, pageviews, avg. visit, bounce rate, a 14-day bar chart, and top pages); its "Open Settings" action switches the sandbox to the Publishing tab.
- Settings reuses the real `settings-widgets` (theme, accent, surface tint, inputs, toggles, integration/endpoint rows) with demo values and fake per-section saves. Appearance applies to the sandbox frame only — theme, accent, and tint are injected as frame-scoped CSS variables, so the marketing page keeps its own theme. Storage shows a read-only R2 readout and a disabled Danger zone.
- The editor is a real TipTap surface: typing updates the word count and fake save state, the slug follows the title (reusing `slugFollowsTitle`/`slugForTitle`), the status control switches draft/published/scheduled, the SEO tab edits metadata with a search preview, and the repurpose rail streams canned variants with copy/cancel.
- Everything stays in React state: no server functions, no database, no auth. The frame is labelled “Demo data only. Nothing is saved.”
- Entry points: the public header nav (“Live demo”), the hero primary CTA (“Try the live demo”), and the login page (“Explore the live demo”).

Verification: `bun run test` (321/321), `bun run check-types`, `bun run check` (221 files), and `bun run build` pass. Browser checks confirmed dashboard stats/heatmap, stat-card and recent-post navigation, draft creation, title-following slug, live word count, status switching, the SEO preview, simulated repurposing with copy, search filtering, the sample analytics view, all five settings tabs with frame-scoped theme/accent application, and no horizontal overflow at 390px.

## Immediate Repair Scope

The T0 baseline repair and M0 through M5 are complete, including the M4.1 publishing-toggles closeout. Local/remote Studio workflows and application identity are also implemented:

- The Drizzle journal is a single regenerated baseline from `full-schema.ts` plus additive milestones through `0007_optimal_switch.sql` (0005 rate limits, 0006 default-model default, 0007 backup restore markers); the `todos` scaffold table is gone and the baseline applies from an empty local D1 (`0000_small_scourge.sql`). Migration 0007 has been applied locally and remotely.
- `bun run db:migrate` now applies through Wrangler (`wrangler d1 migrations apply`); `drizzle-kit` generates SQL only.
- `/posts` lists the owner's non-deleted posts and creates untitled drafts. The posts schema includes description plus publish/schedule timestamps, rejects invalid lifecycle statuses and duplicate owner slugs, and archives invalid legacy statuses during migration.
- `/posts/$postId` is owner-scoped and renders the TipTap editor. It persists canonical JSON with debounced, serialized autosaves and local recovery; word count is derived server-side and writing activity remains positive-only.
- Post metadata validates title and stable slugs, enforces per-owner uniqueness, persists separate SEO title/description fields, and renders an in-place public preview from the canonical body.
- Post lifecycle controls are owner-authorized and batch-capable: draft posts publish, published posts unpublish to drafts, posts can be archived or returned to drafts, soft-deleted posts move to a separate trash collection, and only trashed posts can be restored or permanently purged after explicit confirmation. Once a post has been published, its slug stays immutable across later status changes.
- Media uploads use server-generated `aws4fetch` signatures, direct browser `PUT` requests, immutable owner-scoped keys, pending-to-ready D1 metadata, remote R2 verification (original plus generated preview variant), cancellation cleanup, owner-only listing, filename search, optimized grid previews, reference-safe deletion, editor insertion/reuse, lazy previews with failure fallbacks, authenticated metadata `no-store`, and one-year immutable object cache metadata.
- The public JSON feed (`/api/posts`, `/api/posts/:slug`) serves published, non-soft-deleted owner posts only. CORS allowlist entries live in `settings.allowedOrigins` (editable from the Settings → Site → Public JSON feed section); disallowed browser origins receive 403 with no post content, and TipTap bodies are sanitized to safe http(s) asset URLs.
- M1.3 lands via this branch (`feat/m1.3-deploy`, PR #19): Wrangler OAuth is authenticated; remote D1 `blog-cms` exists with id `142c33e3-399b-4eea-9164-10995ce4f115`; `wrangler.jsonc` now stores that real id; `bun run db:migrate:remote` applied all five migrations (verified via `bunx wrangler d1 info blog-cms`, 9 tables); `docs/deploy.md` and `bun run deploy:check` document and validate bindings/secrets; preview deploys to `https://contentos.parmjeetmishra.com` with the required secrets set via `wrangler secret put` (values sourced from gitignored `.env.local`, never committed). Smoke verified: `/` 200, `/dashboard` 307 to login, `/api/posts` 200 with live D1 posts, disallowed origin 403. OAuth callbacks registered for the custom domain + localhost at GitHub/Google; the instance is claimed and the owner signs in on the canonical domain only.

## Current Handoff

PR #33 backup restore was squash-merged as `749cad8`. M0–M6.1 are all checked. Recent slices:

- T5.1 AI generation (`feat/t5.1-ai-generation`, PR #20): streamed OpenRouter drafting from the writing profile with explicit insert; nothing auto-publishes.
- T5.2 social repurposing (`feat/t5.2-repurpose`, PR #21): read-only per-format variants with explicit copy; source posts never mutated.
- T5.3 scheduled publishing (`feat/t5.3-scheduling`, PR #22): timezone-aware schedule UI plus the 5-minute cron promoter via the custom `src/server.ts` entry.
- M4.1 closeout (`feat/t4.1-publishing-toggles`, PR #23): toggles validate, persist, and drive the feed — `seoMeta` gates SEO fields, `readingTime` adds minutes, `rssFeed` gates `/rss`. M4.1 is checked.
- T6.1 comments policy (`feat/t6.1-comments-policy`, PR #24, docs-only): ADR 0002 keeps comments out of v1; M6.2 stays gated behind a D8 revisit.
- Rate limiting (`feat/rate-limiting`, PR #25): per-key fixed windows over D1 (migration 0005, applied locally + remote) — feed 100/min/IP, RSS 60/min/IP, AI 10/min/user, shared 429s with `Retry-After`.
- Post search (`feat/full-text-search`, PR #26): server-filtered title/slug/description/markup-free body matching from the toolbar `q` param.
- SSE streaming fix (`fix/ai-stream-contract`, PR #27): client parser accepts the server-normalized `{"delta"}` shape; Generate + Repurpose render visibly.
- Model lineup (`feat/model-lineup`, PR #28): GLM 5.3 Flash (default), GPT-5.6 Luna, DeepSeek V4 Flash; migration 0006 retargets the model default (locally + remote).
- Schedule zone fallback (`fix/schedule-tz-fallback`, PR #29): no-settings-row saves use the app default zone; live cron promotion verified on preview.
- Custom-domain docs (`docs/custom-domain`, PR #30, docs-only): canonical origin + single-origin login + per-provider callbacks recorded.
- Backup export (`feat/backup-export`, PR #31): versioned JSON download with R2 file bytes.
- Backup import/restore (`feat/backup-chunked-restore`, PR #33, merged as `749cad8`): Merge and Replace, including a per-object streamed path for backups over 16 MiB. One-shot export/import and chunked E2E artifacts are in `docs/e2e/`. Migration 0007 adds `backup_restores` for idempotent finalization; applied locally and remotely before deploying. Checks: 290/290 tests, types, Biome (213 files), build, and three backup E2Es green. GitHub CI and GitGuardian passed; the separate Cloudflare Workers Builds PR-branch check failed.
- Go-live verification (2026-09-23): docs PR #34 merged as `2364a73`; the expected Cloudflare account, D1, and R2 bindings were confirmed before migration/deploy. Remote D1 has no pending migrations. Canonical owner sign-in, AI Generate and Repurpose streaming, saved model selection (restored to GLM), cron promotion, private/no-store backup export, and a small Merge with slug collision all worked. The temporary scheduled and imported posts were permanently purged; the original post is the only remaining post. See `docs/e2e/go-live-20260923.md`.
- Workers Builds PR-branch failure confirmed: the dashboard preview deploy command is `npx wrangler preview`, which errors because `wrangler.jsonc` has no `previews` block. The same error was reproduced locally; `main` builds succeeded. Isolated PR previews need their own D1/R2 bindings and secrets before being used as a release gate, and are deferred. `deploy:preview` and `deploy` still share the live Worker, not isolated environments (`docs/deploy.md`). M6.2 stays gated behind a D8 revisit.

## Local Worker State

- Cloudflare's Vite plugin can deadlock during Worker export initialization when it persists Miniflare SQLite state under this repository's Btrfs-backed `.wrangler/state` directory.
- `vite.config.ts` uses the plugin's supported `persistState.path` option to store local Worker state under `$XDG_RUNTIME_DIR/contentos-wrangler-state`, falling back to `/tmp/contentos-wrangler-state`. Set `CLOUDFLARE_LOCAL_STATE_PATH` to override the location.
- `bun run db:migrate` uses the same state path as Vite. The runtime directory is cleared after reboot, so run the migration command before starting the dev server in a new session.
- `bun run db:studio:local` discovers the non-metadata SQLite file in that state directory and opens it with Drizzle Studio. `bun run db:studio:remote` uses the D1 HTTP API with `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_D1_DATABASE_ID`, and a scoped `CLOUDFLARE_API_TOKEN`.

## Post Search Pass (2026-09-22)

Branch `feat/full-text-search` delivers owner post search:

- `selectPostRowsByOwner`/`selectDeletedPostRowsByOwner` take an optional
  `{ query }`: empty queries use the lean existing select; otherwise one
  select plus markup-free matching over title, slug, description, and
  plain-text-extracted body (case-insensitive, wildcards literal by
  construction — no LIKE dialect involved).
- `listPosts` validates `{ query }` (trimmed, max 64) and threads it into
  both lists; the `/posts` route carries `q` in search with loader deps,
  and the toolbar has a debounced input with clear that preserves the tab.
- Coverage: title/slug/description/body cases, markup-never-matches,
  wildcard-literal, empty-query, and scoping in `posts.query.test.ts`.
- Deterministic E2E: `scripts/post-search-e2e.ts` (Node via `tsx`) with the
  artifact at `docs/e2e/post-search.log`.

## Rate Limiting Pass (2026-09-22)

Branch `feat/rate-limiting` throttles the anonymous and AI surfaces with
per-key fixed windows:

- Migration `0005` (generated, reviewed) adds the `rate_limits` table
  (`key` PK, `window_start`, `count`); applied locally and to remote D1.
- `rate-limit.query.ts` holds the budgets (feed 100/min/IP, RSS 60/min/IP,
  AI generate/repurpose 10/min/user), epoch-anchored windows, an atomic
  upsert increment, Cloudflare-IP identity resolution, and a shared 429
  responder (`rate_limited` JSON + `Retry-After`, no content leaked).
- Feed handlers take `db` explicitly (no more `getDb` import, so they run
  under throwaway DBs); the AI route logic moved into testable
  `handleGenerateRequest`/`handleRepurposeRequest`. Throttled feed/RSS
  answers carry no posts or items; throttled AI never reaches OpenRouter.
- Coverage: budget/rollover/isolation unit cases plus 429 integration on
  the collection, RSS, and generate paths (14 tests).
- Deterministic E2E: `scripts/rate-limit-e2e.ts` (Node via `tsx`) with the
  artifact at `docs/e2e/rate-limit.log`.

## Comments Policy Pass (2026-09-22)

Branch `feat/t6.1-comments-policy` delivers T6.1 / M6.1 as a decision record,
no code:

- `docs/decisions/0002-comments-policy.md` keeps comments out of v1 (no
  table, endpoints, or UI): readers live on consuming sites, the instance
  has no reader identity, and an open submission endpoint would need bot
  defense, a moderation queue, and PII retention for a single-owner blog.
- The record still binds any future implementation: actors (anonymous
  reader, owner-moderator), states (`pending` → `approved`/`rejected`/
  `spam`, owner-only transitions), abuse handling (bot defense + rate
  limiting, quarantined spam), and deletion (owner hard-delete, 90-day
  purge, cascade with post purge).
- D8 is settled accordingly; M6.2 stays open behind a revisit with
  demonstrated demand, provider-backed first.

## Publishing Toggles Pass (2026-09-22)

Branch `feat/t4.1-publishing-toggles` closes M4.1 — every setting now persists and is applied:

- `publishingInputSchema` requires the three booleans; `upsertPublishing` writes only its own columns and `readOwnerProfile` returns them with schema defaults (`seoMeta` true, `rssFeed` true, `readingTime` false). The Settings Publishing section loads the persisted values, marks dirty through `updatePublishing`, and saves through its own Save row.
- `toFeedPost` takes `{ seoMeta, readingTime }`: off ships empty `seoTitle`/`description` with a stable shape, on adds `readingTimeMinutes` (`ceil(wordCount / 200)`); `selectFeedSettings` carries the flags and `feed.server.ts` threads them into both JSON endpoints.
- `GET /rss` (file `src/routes/rss.ts` — TanStack splits dots, so `/feed.xml` would have routed as `/feed/xml`) serves RSS 2.0 with XML escaping and a 5-minute cache, gated by `rssFeed` (404 with no content while off). `handleRssFeed(request, db)` takes the database for throwaway-DB integration coverage.
- Coverage: publishing schema/round-trip cases, feed gating cases, `rss.server.test.ts` (escaping, empty channel, enabled 200, disabled 404).
- Deterministic E2E: `scripts/publishing-toggles-e2e.ts` (Node via `tsx`) covering persistence round-trip, feed gating, RSS serve/disable, and validation rejection, with the artifact at `docs/e2e/t4.1-publishing-toggles.log`.

## Scheduled Publishing Pass (2026-09-22)

Branch `feat/t5.3-scheduling` delivers T5.3 / M5.3:

- `schedule-time.ts` converts `datetime-local` wall time to UTC in the owner's IANA zone (two offset passes, DST-safe) and back, throwing on malformed input or unknown zones.
- `save-post-schedule.query.ts` (+ server function) schedules drafts with valid metadata at a future instant, or unschedules back to draft; past instants, bad metadata, foreign posts, and published posts are rejected without writes.
- `promote-scheduled.query.ts` publishes every due non-deleted `scheduled` row exactly once: the UPDATE re-checks the status and coalesces `publishedAt`, so overlapping or repeated cron runs are no-ops.
- `src/server.ts` is the custom Worker entry (`fetch` from the Start server entry plus `scheduled` running the promoter); `wrangler.jsonc` points `main` at it and declares `triggers.crons: ["*/5 * * * *"]`.
- The editor sidebar wires the previously mock SchedulePicker to persistence (Save/Clear, per-zone preview, error states) and labels scheduled posts; `PostEditorData` carries `scheduledAt` + `timeZone`.
- Coverage: `schedule-time.test.ts`, `save-post-schedule.query.test.ts`, `promote-scheduled.query.test.ts` (19 tests).
- Deterministic E2E: `scripts/schedule-e2e.ts` (Node via `tsx`) covering tz-correct scheduling, one-time promotion with stable `publishedAt`, past-instant rejection, unschedule, and the worker wiring assertions, with the artifact at `docs/e2e/t5.3-schedule.log`.

## AI Repurposing Pass (2026-09-22)

Branch `feat/t5.2-repurpose` delivers T5.2 / M5.2 on the T5.1 streaming core:

- `src/features/ai/ai-repurpose.ts` fixes the D7 formats (twitter, linkedin, instagram, reels) with visible `PLATFORM_LABELS`, per-format system instructions, `repurposeInputSchema` (postId required, platform enum), and `buildRepurposeMessages` (title + up-to-6000-chars source text, "Untitled" titles omitted). `post-body.ts` gains an exported `extractPlainText` for TipTap-to-text conversion.
- `ai.server.ts` extracts the shared `streamChatCompletion` helper and adds `repurposePostStream`: owned-post load, empty-source rejection (`empty_source`, 422, no provider call), profile-steered messages, normalized SSE. Repurposing never writes — the source row is byte-identical after success, outage, and abort.
- Route `POST /api/ai/repurpose` mirrors the generate route (401/400/404/422/503/502 JSON) with the same key/base-URL env resolution.
- The editor RepurposeRail is wired: platform tabs reset in-flight state on switch, Generate streams the labeled variant with Cancel, the variant panel shows the format label + model + explicit Copy (clipboard, no editor mutation), and errors degrade to setup guidance when unconfigured.
- Coverage: `ai-repurpose.test.ts` (format set/labels, schema, distinct per-format instructions, truncation, plain-text extraction) and `ai-repurpose.server.test.ts` (throwaway DB: labeled variant stream with profile model, empty/foreign-post/outage/not-configured paths, source-intact throughout).
- Deterministic E2E: `scripts/ai-repurpose-e2e.ts` (Node via `tsx`) against a stub OpenRouter server (success, empty source, 503 outage, missing key, mid-stream abort) with the artifact at `docs/e2e/t5.2-repurpose.log`.

## AI Generation Pass (2026-09-22)

Branch `feat/t5.1-ai-generation` delivers T5.1 / M5.1:

- `src/features/ai/` adds pure prompt building (`buildSystemPrompt` steers from `writingStyle`/`writingSample`, `resolveModel` prefers an override, then the profile default, then `google/gemini-2.5-flash`), incremental OpenRouter SSE parsing (`createSseParser` tolerates split chunks, heartbeats, and `[DONE]`), and provider error mapping (401 invalid key, 402 credits, 429 rate-limited, 5xx unavailable).
- `ai.server.ts` exposes `generateDraftStream`: owner post-ownership check, profile resolution, and a normalized `text/event-stream` response (`data: {"delta"}` events, `x-ai-model` header). It never writes to the database, so failures and aborts leave the draft intact; the client passes its AbortSignal straight to the upstream fetch.
- Route `POST /api/ai/generate` requires the owner session (401 otherwise), validates with `generateInputSchema` (400), returns typed `AiError` JSON (404 unknown/foreign post, 503 unconfigured, 502 provider), and resolves the key from `OPENROUTER_API_KEY`/`OPENROUTER_KEY` plus `OPENROUTER_BASE_URL` (all optional in `env.ts`; key set via `wrangler secret put` on deploy).
- The editor gains a Generate action opening a review dialog: prompt input, streaming output with Cancel, setup guidance when unconfigured, and explicit Insert into editor (paragraph blocks at the cursor, then normal autosave) / Discard. Nothing auto-publishes; the T5.2 repurpose rail stays a disabled placeholder.
- Coverage: `ai-prompts.test.ts`, `ai-stream.test.ts`, `ai.server.test.ts` (throwaway DB: success streams deltas with profile model + bearer key, not-configured/outage/unknown-post/foreign-post never call the provider, abort propagates, draft row unchanged throughout).
- Deterministic E2E: `scripts/ai-generate-e2e.ts` (run under Node via `tsx` — Bun cannot load `better-sqlite3`) drives the real orchestration against a stub OpenRouter server (success, 503 outage, missing key, mid-stream abort) with the artifact at `docs/e2e/t5.1-ai-generate.log`.

## AI Streaming Fix + Model Lineup (2026-09-23)

Live-bug follow-ups, both verified in the browser on the custom-domain preview:

- SSE contract fix (PR #27): the server normalizes upstream events to `data: {"delta"}`, but the shared client parser only accepted OpenRouter-native `choices[].delta.content` — every event was silently dropped, so Generate/Repurpose streamed bytes that never rendered. `createSseParser` now accepts both shapes (2 new regression cases; both editor surfaces fixed by the one change).
- Lighter model lineup: Settings → Account offers GLM 5.3 Flash (`z-ai/glm-5.3-flash`, default), GPT-5.6 Luna (`openai/gpt-5.6-luna`), and DeepSeek V4 Flash (`deepseek/deepseek-v4-flash-0731`); Gemini/Haiku/GPT-4o mini/Llama entries removed. Migration `0006` changes only the `settings.default_model` default (table rebuild preserves rows, applied locally + remote and verified). Previously saved preferences are honored unchanged — re-pick the model in Settings → Account to switch.

## Backup Export Pass (2026-09-23)

Branch `feat/backup-export` delivers the export half of backup/restore:

- `GET /api/backup/export` (owner session, 401 otherwise) returns a versioned (`version: 1`) JSON download (`content-disposition: attachment`). The bundle carries all owner posts including soft-deleted rows with statuses and ISO timestamps, the settings row without the owner binding, all media rows with original + preview objects base64-encoded, and writing-activity days.
- Missing R2 objects degrade to `{ missing: true }` entries instead of failing; an empty instance exports a valid empty bundle. The Danger zone's dead Export placeholder is now a working Download backup link.
- Coverage: `backup-export.test.ts` (empty/status/base64/missing/settings passthrough) and `backup-export.server.test.ts` (throwaway DB: owner scoping, null settings, download headers, byte round-trip, missing tolerance).
- Deterministic E2E: `scripts/backup-export-e2e.ts` (Node via `tsx`) with the artifact at `docs/e2e/backup-export.log`.
- Import follow-up (branch `feat/backup-chunked-restore`): owner-only one-shot `POST /api/backup/import?mode=merge|replace` accepts <=16 MiB JSON with same-origin and explicit `REPLACE` confirmation. Larger files send raw media objects through `PUT /api/backup/session` and finalize bounded metadata through `POST /api/backup/session`; `DELETE` cancels staged uploads. D1 migration 0007 records committed session IDs to make lost-response retries idempotent. Merge retains existing settings and maxes overlapping activity counts; Replace swaps owner rows in one D1 batch and deletes old R2 objects after commit. New v1 exports carry post/media IDs; older v1 files without IDs remap by URL. Deterministic E2E artifacts: `docs/e2e/backup-import.log` (both modes and failures) and `docs/e2e/backup-chunked.log` (>16 MiB bytes, retry, cancel, missing upload and DB failure). Details and limits in `docs/backup.md`.

## Settings Form Pass (2026-09-22)

Branch `feat/m4.1-settings-form` completes the remaining T4.1 / M4.1 form wiring:

- Three validated input groups in `settings.query.ts`: `identityInputSchema` (blogTitle, hostname-or-https domain, bio), `accountInputSchema` (displayName, non-empty defaultModel, writingStyle/writingSample), `publishingInputSchema` (IANA timeZone via `Intl.DateTimeFormat`, empty-or-http(s) umamiShareUrl). Matching `upsertIdentity`/`upsertAccount`/`upsertPublishing` use the `settings.userId` conflict target and only touch their own columns.
- `readOwnerProfile` returns the full owner profile (defaults when no row exists); `getOwnerSettings`/`saveIdentitySettings`/`saveAccountSettings`/`savePublishingSettings` are session-scoped server functions (GET paths send `Cache-Control: no-store`).
- The settings page loads profile + storage + feed allowlist on mount, adds per-section Save rows (Site, Account, Publishing) with dirty/saving/saved/error states, inserts a Time zone field under Publishing preferences, and marks the R2 Storage section read-only from `getStorageSettings` (`R2_*` env; `bucket`/`publicUrl`/`accountId` editable fields removed from `SettingsForm`, fixing the bucket/bucketName mismatch).
- Publishing toggles (`seoMeta`/`rssFeed`/`readingTime`), Integrations, and Danger zone remain reference layouts (no consumers; RSS deferred; comments D8).
- Coverage: `settings.query.test.ts` (schema accept/reject cases + throwaway-DB profile defaults, group round-trips, independent updates).

## Public Feed Pass (2026-09-22)

Branch `feat/m3.3-public-feed` delivers T3.3 / M3.3:

- `src/features/feed/` adds pure CORS/origin utilities (`parseAllowedOrigins`, `evaluateFeedCors`), published-only queries (`selectPublishedFeedPosts`, `selectPublishedFeedPostBySlug`, `selectInstanceOwnerId`, `selectFeedSettings`), body sanitization (`sanitizeFeedBody` drops media with non-http(s) sources and strips unsafe link hrefs), and JSON response helpers with `Cache-Control: public, max-age=60`.
- Routes `GET`/OPTIONS `/api/posts` and `/api/posts/:slug` return `{ posts: [...] }` or a single `FeedPost` (`slug`, `title`, `description`, `seoTitle`, `publishedAt`, `updatedAt`, `wordCount`, `url`, TipTap `body`). No Origin header (non-browser client) is allowed; a present Origin must match the allowlist or the response is 403 with no post content. Missing/draft slugs return 404.
- `settings.allowedOrigins` gains a read/write path (`getFeedSettings`/`saveFeedSettings`, owner-scoped, `no-store`) and the Settings → Site → Public JSON feed section loads the allowlist and saves it with an explicit Save origins button.
- Coverage: `feed.utils.test.ts` (origin parsing, CORS decisions, URL building, body sanitization, serialization) and `feed.query.test.ts` (throwaway DB: owner resolution, published-only collection order, slug visibility, allowlist read).

## Settings & Appearance Pass (2026-09-22)

PR #13 (`fix/dashboard-visual-refresh`) completes the M4.1 appearance slice wiring:

- `src/db/schema.ts` adds `themeMode` (`text`, not null, default `night`) and nullable `surfaceTint` to `settings`. Migration `src/db/drizzle/0003_acoustic_karnak.sql` applies `ALTER TABLE settings ADD theme_mode ...` and `ADD surface_tint ...`; it was generated with `bun run db:generate` and applied locally with `bun run db:migrate` (3 commands executed successfully).
- `src/features/settings/settings.types.ts` extends `SettingsForm`/`DEFAULT_SETTINGS` and adds `ThemeMode` (`system | day | night`), `AppearanceSettings`, and `DEFAULT_APPEARANCE` (`night`, `#7c3aed`, empty tint).
- `src/features/settings/appearance.ts` is the client appearance contract: `APPEARANCE_STORAGE_KEY` (`contentos-appearance`), cache read/write, `normalizeAppearance`, `applyAppearance` (toggles `.dark` on `documentElement`, sets `--brand` and `--surface-tint`, and tracks `prefers-color-scheme` for `system` mode with listener cleanup), plus `APPEARANCE_BOOTSTRAP_SCRIPT` for no-flash head injection.
- `src/features/settings/functions/` adds the owner-scoped read/write path: `appearanceInputSchema` validates the theme enum, a `#rrggbb` accent, and an empty-or-hex tint; `readAppearance`/`upsertAppearance` use the `settings.userId` conflict target; server and server-function wrappers require a session and return `Cache-Control: no-store`.
- `__root.tsx` drops the hardcoded `<html className="dark">` and injects the bootstrap script before first paint (`suppressHydrationWarning` on `<html>`). `_protected.tsx` loads appearance in `beforeLoad` and applies it in an effect; `_protected/settings.tsx` passes it into the page.
- The settings page is tabbed (Appearance, Account, Site, Publishing, Storage). Appearance controls (theme segmented control, AccentPicker, explicit Plain/Tinted card-surface control with a tint picker) apply live via `setAppearance` and persist through `saveAppearanceSettings`; the header Save button is scoped to that appearance slice.
- `styles.css` adds `--surface-tint`, `--flat-surface` (`color-mix` of card + 8% tint), and editor code tokens; dashboard and shared `bg-card` surfaces swap to `bg-flat-surface`; editor ProseMirror/editor-content and login hardcoded hexes swap to theme tokens for day mode.
- Unit coverage: `src/features/settings/appearance.test.ts` (normalize, cache round-trip, bootstrap script shape), `src/features/settings/components/settings-widgets.test.tsx` (surface-tint hex field accepts partial keystrokes, reverts an invalid draft on blur, and selects Plain/Tinted surfaces), and `src/features/analytics/pages/analytics-page.test.tsx` (analytics uses the saved appearance token).

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

## Media Library Pass (2026-09-22)

`feat/m3.2-media-library` completes M3.2 on top of the PR #13 baseline:

- Schema: migration `0004_fuzzy_flatman.sql` adds `preview_key`, `preview_url`, `preview_type`, and `preview_size` to `media`. Preview variants live beside the original at `media/{ownerId}/{uuid}-{name}.preview.{webp|jpg|png}` under the same immutable owner-scoped prefix.
- Upload flow: the browser generates an optimized still before initiation — image thumbnails via canvas (WebP with JPEG fallback, max 640 px) and video posters via a seeked frame capture (JPEG). Initiate presigns both objects; completion verifies the original *and* the declared variant against stored size/type before `ready`; cancellation or failed verification deletes both objects and the pending row. Uploads also record intrinsic dimensions and video duration for the grid/detail badge.
- The media grid and detail panel prefer `previewUrl` (variant) and fall back to the original, then a type icon, so the library no longer downloads full originals for browsing. Legacy M3.1 assets without variants keep the previous behavior.
- Search: case-insensitive filename search combines with the existing All/Images/Videos filters; header counts reflect the filtered view.
- Deletion: `getMediaUsage` scans every owner post body (TipTap JSON `mediaAsset` nodes by `mediaId`/`src`, plus exact URL matches for legacy text) and `deleteMedia` hard-deletes only after policy checks — references from `published`/`scheduled` posts always throw with the post titles, other references require `acknowledgeUsage: true`, and unreferenced assets delete their R2 original + preview then the D1 row. The detail panel surfaces blocked/confirm states before the request.
- Editor insertion: a `mediaAsset` TipTap atom node (`data-media-id`) stores the library id, source URL, and poster; the editor header's Media button opens a searchable picker that inserts ready assets for reuse across posts. The full-screen preview registers the same node so embedded media renders there.
- M3.1 guarantees are unchanged: owner authorization, five-minute presigned direct uploads, server-only credentials, pending-to-ready R2 verification, immutable keys, and `no-store` authenticated metadata responses.

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
