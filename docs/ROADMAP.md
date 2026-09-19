# ContentOS Roadmap

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

- [ ] **M1.2: Migrate persistence to the production-compatible driver.**
  - Depends on: M1.1.
  - Make authentication, posts, settings, media metadata, and writing activity use the selected database in local and Worker environments.
  - Acceptance: migrations apply from an empty database and a Worker preview can read/write each core model.

- [ ] **M1.3: Establish deployment verification.**
  - Depends on: M1.2.
  - Add documented preview and production deployment commands with environment/binding validation.
  - Acceptance: a preview deployment supports an authenticated smoke test without native SQLite dependencies.

## Milestone 2: Post Management

**Goal:** Let the owner manage a complete post lifecycle.

- [ ] **M2.1: Implement post listing and creation.**
  - Depends on: M0.4, M1.2.
  - Replace the placeholder Posts route with an owner-scoped list and create-draft workflow.
  - Acceptance: a signed-in owner can create and find an untitled draft; another user cannot access it.

- [ ] **M2.2: Implement the rich post editor.**
  - Depends on: M2.1.
  - Add the chosen rich-text editor, autosave, word counting, and editing recovery behavior.
  - Acceptance: content survives reloads, word count is correct for the canonical body representation, and writing activity records only positive additions.

- [ ] **M2.3: Add post metadata and live preview.**
  - Depends on: M2.2.
  - Support title, stable slug, SEO title/description, validation, and a live public-preview representation.
  - Acceptance: invalid or duplicate slugs are rejected; valid metadata renders in preview and is persisted.

- [ ] **M2.4: Complete the post lifecycle.**
  - Depends on: M2.3.
  - Add publish/unpublish, soft delete, restore, purge, and bulk actions with clear irreversible-action confirmation.
  - Acceptance: each lifecycle transition is owner-authorized, reflected in the dashboard, and covered by integration tests.

## Milestone 3: Media And Public Delivery

**Goal:** Deliver publishable content and managed assets safely.

- [ ] **M3.1: Implement R2 media uploads.**
  - Depends on: M1.2, M2.2.
  - Add owner-authorized upload initiation, MIME/size validation, stable object keys, and persisted media metadata.
  - Acceptance: an uploaded image can be inserted into a post without exposing storage credentials to the browser.

- [ ] **M3.2: Implement the media library.**
  - Depends on: M3.1.
  - Provide an owner-facing searchable asset list, selection flow, deletion policy, and placeholders for media in editor content.
  - Acceptance: assets can be reused across posts and deleted assets cannot silently leave broken published content.

- [ ] **M3.3: Implement the public JSON feed.**
  - Depends on: M2.4, M3.1.
  - Add CORS-gated collection and single-post endpoints that expose only published posts and safe asset URLs.
  - Acceptance: allowed origins receive the documented response; disallowed origins and drafts receive no publishable content.

## Milestone 4: Owner Preferences And Insights

**Goal:** Let the owner configure how ContentOS writes and measures content.

- [ ] **M4.1: Implement settings management.**
  - Depends on: M2.1.
  - Add owner-managed blog identity, accent color, timezone, feed origins, model preference, writing profile, and storage/analytics settings.
  - Acceptance: each setting is validated, persists, and is applied by its dependent feature.

- [ ] **M4.2: Complete dashboard behavior.**
  - Depends on: M2.4, M4.1.
  - Verify dashboard totals, recent posts, continue-writing behavior, and time-zone-aware heatmap against real post activity.
  - Acceptance: all dashboard states have end-to-end coverage and navigation leads to functional post workflows.

- [ ] **M4.3: Implement Umami analytics.**
  - Depends on: M4.1.
  - Embed or link the configured owner-only Umami dashboard with a secure setup flow.
  - Acceptance: analytics are unavailable until configured and do not expose credentials or owner-only URLs publicly.

## Milestone 5: AI And Automation

**Goal:** Add optional writing assistance without compromising ownership or published content.

- [ ] **M5.1: Implement AI post generation.**
  - Depends on: M2.2, M4.1.
  - Add streamed generation using the selected model and writing profile, with cancellation, error states, and explicit owner approval before persistence.
  - Acceptance: generated text is never published automatically and provider failures leave the draft intact.

- [ ] **M5.2: Implement social repurposing.**
  - Depends on: M5.1.
  - Generate owner-reviewable variants for the supported social formats from an existing post.
  - Acceptance: each variant is visibly labeled by target format and can be copied without changing the source post.

- [ ] **M5.3: Implement scheduled publishing.**
  - Depends on: M1.3, M2.4, M4.1.
  - Add a publish-at instant, schedule management UI, and reliable Worker-side execution.
  - Acceptance: a scheduled post publishes once at the expected time in the configured timezone, including after worker restarts.

## Milestone 6: Optional Community Features

**Goal:** Add comments only after the core single-owner publishing system is stable.

- [ ] **M6.1: Define the comments policy.**
  - Depends on: M3.3.
  - Decide whether comments are public, authenticated, moderated, or external-provider-backed; document spam, privacy, and retention rules before adding a table.
  - Acceptance: a decision record identifies actors, moderation states, abuse handling, and deletion behavior.

- [ ] **M6.2: Implement the approved comments workflow.**
  - Depends on: M6.1.
  - Deliver the chosen end-to-end comment submission and moderation behavior.
  - Acceptance: comments comply with the policy and are protected against unauthorized moderation and common abuse paths.

## Deferred Enhancements

- Command palette and keyboard shortcuts.
- RSS feed generation, if the existing setting is retained.
- Full-text post/media search.
- Import/export and instance backup/restore.
- Observability, error reporting, rate limiting, and security hardening beyond baseline authorization.
- Accessibility and responsive-design audit after the functional workflows stabilize.
