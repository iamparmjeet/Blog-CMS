# PageOwl Roadmap

This roadmap turns the current README commitments into independently verifiable implementation slices. Complete each milestone in order unless its dependencies have been explicitly reconsidered.

## Working Rules

- A completed item includes its user-facing behavior, authorization, validation, and automated coverage.
- Keep the default branch type-checking, test-green, and Biome-clean after every item.
- Update `docs/IMPLEMENTATION-STATUS.md` and the checkboxes below when a milestone is completed or its scope changes.
- Do not add a feature merely because a schema field exists. Every feature needs a supported workflow and an owner-visible UI.

## Milestone 0: Stabilize The Foundation

**Goal:** Make the existing app reliable enough to extend.

- [x] **M0.1: Repair the dashboard contract.**
  - Depends on: none.
  - Resolve the unsupported-status behavior, align dashboard data types, and make dashboard tests pass.
  - Acceptance: `bun run test` passes and the dashboard distinguishes supported statuses from invalid data according to an explicit contract.

- [x] **M0.2: Consolidate writing-activity code.**
  - Depends on: M0.1.
  - Retire or migrate obsolete activity modules so imports and schema usage match the active writing-activity model.
  - Acceptance: `bunx tsc --noEmit` has no writing-activity errors and the heatmap is covered by deterministic unit tests.

- [x] **M0.3: Restore code-quality checks.**
  - Depends on: M0.2.
  - Align Biome configuration with its installed version and resolve existing source diagnostics without weakening rules.
  - Acceptance: `bun run check` passes.

- [x] **M0.4: Define repeat-owner authentication.**
  - Depends on: none.
  - Decide and document how the claimed owner signs in again while preventing a second owner from claiming the instance.
  - Acceptance: first claim, repeat owner sign-in, and second-user rejection are covered by integration tests.

## Milestone 1: Deployable Persistence

**Goal:** Use one supported persistence model in development and Cloudflare production.

- [x] **M1.1: Decide the production database architecture.**
  - Depends on: M0.3.
  - Select the Workers-compatible database binding and write an ADR covering local development, migrations, secrets, and rollback.
  - Acceptance: the decision is documented and the Worker configuration declares every required binding.

- [x] **M1.2: Migrate persistence to the production-compatible driver.**
  - Depends on: M1.1.
  - Make authentication, posts, settings, media metadata, and writing activity use the selected database in local and Worker environments.
  - Acceptance: migrations apply from an empty database and a Worker preview can read/write each core model.

- [x] **M1.3: Establish deployment verification.**
  - Depends on: M1.2.
  - Add documented preview and production deployment commands with environment/binding validation.
  - Remote D1 setup: authenticate with `bunx wrangler login` (with `CLOUDFLARE_API_TOKEN` unset), create `blog-cms` with `bunx wrangler d1 create blog-cms`, replace the placeholder `database_id` in `wrangler.jsonc`, then run `bun run db:migrate:remote` and verify with `bunx wrangler d1 info blog-cms`.
  - Acceptance: a preview deployment supports an authenticated smoke test without native SQLite dependencies.

## Milestone 2: Post Management

**Goal:** Let the owner manage a complete post lifecycle.

- [x] **M2.1: Implement post listing and creation.**
  - Depends on: M0.4, M1.2.
  - Replace the placeholder Posts route with an owner-scoped list and create-draft workflow.
  - Acceptance: a signed-in owner can create and find an untitled draft; another user cannot access it.

- [x] **M2.2: Enforce the publishing schema.**
	- Depends on: M2.1.
	- Add post description and lifecycle timestamps, enforce per-owner slug uniqueness and valid statuses, and resolve invalid legacy statuses before applying the constraint.
	- Acceptance: a fresh local D1 applies the migration; invalid statuses are archived before the constraint applies; owner slug collisions are rejected.

- [x] **M2.3: Implement the rich post editor.**
	- Depends on: M2.2.
	- Add the chosen rich-text editor, autosave, word counting, and editing recovery behavior.
	- Acceptance: content survives reloads, word count is correct for the canonical body representation, and writing activity records only positive additions.

- [x] **M2.4: Add post metadata and live preview.**
	- Depends on: M2.3.
	- Support title, stable slug, SEO title/description, validation, and a live public-preview representation.
	- Acceptance: invalid or duplicate slugs are rejected; valid metadata renders in preview and is persisted.

- [x] **M2.5: Complete the post lifecycle.**
	- Depends on: M2.4.
  - Add publish/unpublish, soft delete, restore, purge, and bulk actions with clear irreversible-action confirmation.
  - Acceptance: each lifecycle transition is owner-authorized, reflected in the dashboard, and covered by integration tests.

- [x] **M2.6: Build the owner app shell and page UI kit.**
	- Depends on: M2.5.
	- Add persistent owner navigation, a command palette, and the shared ContentOS UI kit, then rebuild every protected page layout on it.
	- Acceptance: every protected route renders inside the shell with keyboard-accessible navigation and a responsive mobile drawer; page data wiring lands with its owning milestone (M3.2 media, M4.1 settings, M4.3 analytics).

## Milestone 3: Media And Public Delivery

**Goal:** Deliver publishable content and managed assets safely.

- [x] **M3.1: Implement R2 media uploads.**
	- Depends on: M1.2, M2.3.
  - Add owner-authorized upload initiation, MIME/size validation, stable object keys, and persisted media metadata.
  - Acceptance: a supported image or video uploads directly to R2 through a short-lived presigned URL, transitions owner-scoped metadata from pending to ready only after object verification, and never exposes storage credentials to the browser.

- [x] **M3.2: Implement the media library.**
  - Depends on: M3.1.
  - Complete the owner-facing asset library with search, editor insertion, selection flow, deletion policy, optimized thumbnail variants, and placeholders for media in editor content. M3.1 already provides the ready-asset grid and original-object previews.
  - Acceptance: assets can be reused across posts and deleted assets cannot silently leave broken published content.

- [x] **M3.3: Implement the public JSON feed.**
	- Depends on: M2.5, M3.1.
  - Add CORS-gated collection and single-post endpoints that expose only published posts and safe asset URLs.
  - Acceptance: allowed origins receive the documented response; disallowed origins and drafts receive no publishable content.

## Milestone 4: Owner Preferences And Insights

**Goal:** Let the owner configure how ContentOS writes and measures content.

- [x] **M4.1: Implement settings management.**
  - Depends on: M2.1.
  - Add owner-managed blog identity, accent color, timezone, feed origins, model preference, writing profile, and storage/analytics settings.
  - Acceptance: each setting is validated, persists, and is applied by its dependent feature.

- [x] **M4.2: Complete dashboard behavior.**
	- Depends on: M2.5, M4.1.
  - Verify dashboard totals, recent posts, continue-writing behavior, and time-zone-aware heatmap against real post activity.
  - Acceptance: all dashboard states have end-to-end coverage and navigation leads to functional post workflows.

- [x] **M4.3: Implement Umami analytics.**
  - Depends on: M4.1.
  - Embed or link the configured owner-only Umami dashboard with a secure setup flow.
  - Acceptance: analytics are unavailable until configured and do not expose credentials or owner-only URLs publicly.

## Milestone 5: AI And Automation

**Goal:** Add optional writing assistance without compromising ownership or published content.

- [x] **M5.1: Implement AI post generation.**
	- Depends on: M2.3, M4.1.
  - Add streamed generation using the selected model and writing profile, with cancellation, error states, and explicit owner approval before persistence.
  - Acceptance: generated text is never published automatically and provider failures leave the draft intact.

- [x] **M5.2: Implement social repurposing.**
  - Depends on: M5.1.
  - Generate owner-reviewable variants for the supported social formats from an existing post.
  - Acceptance: each variant is visibly labeled by target format and can be copied without changing the source post.

- [x] **M5.3: Implement scheduled publishing.**
	- Depends on: M1.3, M2.5, M4.1.
  - Add a publish-at instant, schedule management UI, and reliable Worker-side execution.
  - Acceptance: a scheduled post publishes once at the expected time in the configured timezone, including after worker restarts.

## Milestone 6: Optional Community Features

**Goal:** Add comments only after the core single-owner publishing system is stable.

- [x] **M6.1: Define the comments policy.**
  - Depends on: M3.3.
  - Decide whether comments are public, authenticated, moderated, or external-provider-backed; document spam, privacy, and retention rules before adding a table.
  - Acceptance: a decision record identifies actors, moderation states, abuse handling, and deletion behavior.

- [ ] **M6.2: Implement the approved comments workflow.**
  - Depends on: M6.1.
  - Deliver the chosen end-to-end comment submission and moderation behavior.
  - Acceptance: comments comply with the policy and are protected against unauthorized moderation and common abuse paths.

- [x] **Full-text post search.** Owner-scoped title/slug/description/body matching from the posts toolbar (server-filtered, markup-free), covered by query tests and a deterministic E2E.

- [x] **Instance backup and restore.** Owner-only versioned JSON export plus Merge/Replace import with slug and media remapping, confirmation, and deterministic E2E. Large backups stream each media object before a metadata-only commit; see `docs/backup.md`.

- [x] **PageOwl identity refresh.** Replace the public/owner brand marks and icon assets, use the blue token palette across both themes, default new appearances to day, and preserve existing saved theme choices when changing the database default. This is a UI-brand change; legacy ContentOS backup/runtime identifiers remain compatible.

- [x] **Live demo sandbox.** A public `/demo` renders the real dashboard, posts list, and TipTap editor with deterministic sample data and simulated repurposing, all client-side; the header nav, hero, and login page link to it.

- [x] **Title-following draft slugs.** New drafts derive their URL from the title while it is untouched, collisions get numeric suffixes across every owner slug (including trashed rows), a manual slug edit stops the follow, and the slug freezes once the post has been published. Covered by test-first units and a deterministic E2E.

- [x] **Marketing follow-up pass.** The public mobile menu opens with a 40px target and closes on Escape, after a nav link is tapped, and when the viewport grows past the desktop breakpoint; brand buttons derive a readable white/ink foreground for every saved accent; day-mode muted text and the hero gradient meet contrast; the setup snippet uses real clone/migrate/deploy commands with a deploy-guide link; the hero and final CTAs self-host instead of implying open signup; and the mobile product preview shows the repurpose panel.

## Final Testing / Go-Live

The backup restore slice is merged and its new schema and Worker code have been verified together on the canonical live instance. The separate PR-preview build failure has been diagnosed and deferred:

- [x] Apply `0007_optimal_switch.sql` to remote D1 with `bun run db:migrate:remote`; verify `bunx wrangler d1 migrations list blog-cms --remote` reports no pending migrations and `backup_restores` exists. Completed before deployment on 2026-09-23.
- [x] Redeploy `main` with `bun run deploy:preview` after checking the target account and bindings. Preview and production use the same Worker (`docs/deploy.md`). Deployed version `866a4766-89d5-451d-b658-ea24b28c3a6d` on 2026-09-23.
- [x] On `https://contentos.parmjeetmishra.com`, verify owner sign-in, visible AI Generate/Repurpose streams, saved model selection, a live scheduled-post promotion, backup download, and a small **Merge** restore. Completed on 2026-09-23; the two temporary posts were purged afterward and the original post remains. Do not use Replace on the live owner instance solely as a smoke test.
- [x] Investigate the failing Cloudflare Workers Builds PR-branch check. The branch build completes installation and compilation, then its `npx wrangler preview` deploy command fails because `wrangler.jsonc` has no `previews` block. Production `main` builds and the live smoke test pass. Branch previews are deferred and are not a go-live gate; see `docs/e2e/go-live-20260923.md`.
- [x] Apply `0008_sad_roland_deschain.sql` to remote D1 and redeploy `main` with the PageOwl identity and marketing follow-up (version `14132947-55dd-40f6-ae7a-06a1b45bbf0c`) on 2026-09-23. The migration preserved the saved night-mode choice and backfilled the violet accent to blue; the live smoke test passed and mobile menu/contrast/preview were verified at 390px. See `docs/e2e/go-live-20260923.md`.
- [ ] Confirm owner sign-in at the new `https://pageowl.parmjeetmishra.com` origin. The owner reports both OAuth provider callback URLs updated, and the Worker generates the new callback URLs. The title-following slug and demo commits are pushed and `/demo`, `/`, `/dashboard` (signed-out redirect), and `/api/posts` pass public smoke checks at the new origin; no migrations are pending. The old domain no longer resolves.

## Deferred Enhancements

- Configure isolated Cloudflare Workers PR previews with a `previews` block, staging D1/R2 bindings, and Preview-specific secrets before making the branch-build check a release gate. Retrying the unchanged build does not fix its missing configuration.
- Command palette and keyboard shortcuts.
- Streaming JSON parsing for very large backup files on memory-constrained browsers, and automated cleanup of staging objects after abandoned uploads.
- Observability, error reporting, and security hardening beyond baseline authorization and rate limiting.
- Accessibility and responsive-design audit after the functional workflows stabilize. (The landing page had an initial pass on 2026-09-19; the full audit is still pending.)
