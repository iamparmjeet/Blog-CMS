# ContentOS Implementation Plan

**Destination:** a deployable single-owner blog CMS — owner can write, publish, and serve posts through a CORS-gated public feed on Cloudflare Workers, with media, settings, dashboard insights, and optional AI assistance.

**Companions:** `docs/ROADMAP.md` (milestone checkboxes — the tracking surface), `docs/IMPLEMENTATION-STATUS.md` (current-state baseline), `CONTEXT.md` (domain glossary). This file is the execution detail: decisions, ticket slices, order, and verification.

## 1. Baseline (verified 2026-09-18)

- Routes that exist: `/`, `/login`, `/dashboard`, `/posts` (placeholder text only), `/api/auth/$`.
- Working: marketing page, OAuth config + first-claim guard (`src/lib/auth/auth.ts`), session-guarded `_protected` layout, dashboard UI + aggregation, `savePostBody` server function (no UI calls it).
- Red state: `bun run test` 10/11 (one dashboard status-contract failure), `bunx tsc --noEmit` fails (stale `#/features/writing-activity/*` imports in `dashboard.activity.ts` + `activity-grid.tsx`, `DashboardData.activity` missing from `buildDashboardData` return, stale `#/lib/auth-client` import in `header-user.tsx`), `bun run check` fails (Biome version drift + formatting/import diagnostics). `bun run build` passes.
- Schema gaps: `posts` has no `description`, no `publishedAt`/`scheduledAt`, no per-user slug uniqueness; `todos` table is scaffold leftover; `media.status` defaults to `pending` with no workflow behind it.
- Deployment gap: `wrangler.jsonc` declares no D1/R2 bindings; `src/db/index.ts` uses `process.env.DATABASE_URL!` with `better-sqlite3`, which cannot run on Workers.

## 2. Decisions (resolve before / during the marked phase)

| # | Question | Recommendation | Needed by |
|---|----------|----------------|-----------|
| D1 | Production database target | **Cloudflare D1** via `drizzle-orm/d1`; local dev against local D1 (wrangler) so dev/prod share one driver. ADR required. | Phase 1 |
| D2 | Repeat owner sign-in | Owner may always sign in; only a *second distinct user* is rejected. Fix login loader + keep the `databaseHooks` guard. | Phase 0 |
| D3 | Canonical post-body representation | **TipTap JSON** stored in `posts.body`; word count derived from text nodes server-side. One rule, used by editor, preview, feed, and activity. | Phase 2 |
| D4 | Slug rules | `^[a-z0-9]+(?:-[a-z0-9]+)*$`, unique per `userId` (DB unique index), immutable once published unless owner explicitly regenerates. | Phase 2 |
| D5 | Media object keys | Immutable `media/<userId>/<uuid>-<sanitized-name>`; DB stores key + public URL; deletes remove the object then the row. | Phase 3 |
| D6 | Scheduled publishing mechanism | `posts.scheduledAt` + **Workers Cron Trigger** promoting due `scheduled` → `published`. | Phase 5 |
| D7 | AI provider | OpenRouter chat completions, streamed; model default from `settings.defaultModel`; repurpose formats fixed to Twitter/LinkedIn/Instagram/Reels. | Phase 5 |
| D8 | Comments in v1 | **Defer** — no table, no UI. Revisit only after the public feed is stable (Phase 6 stays optional). | Now (default) |

If any recommendation is rejected, update this table and the affected tickets before starting that phase.

## 3. Ticket slices (vertical, demoable, ordered by `Blocked by`)

### Phase 0 — Stabilize the foundation (ROADMAP M0)

- **T0.1 Repair dashboard status contract.** Blocked by: none. Treat `archived` as a supported status from the start; normalize out-of-contract values to `unknown` (never `draft`); extend `DashboardPostStatus`; fix the failing test; align `buildDashboardData` return with `DashboardData` (include `activity`). Verify: `bun run test`.
- **T0.2 Remove obsolete writing-activity modules.** Blocked by: T0.1. Delete or migrate `dashboard.activity.ts` and `activity-grid.tsx` (they import `#/features/writing-activity/*`, which does not exist, and reference removed columns `date`/`wordsDeleted`/`saveCount`). Verify: `bunx tsc --noEmit`.
- **T0.3 Restore static checks.** Blocked by: T0.2. Fix stale `#/lib/auth-client` import, unused imports, Biome config version drift (`biome.json` schema 2.2.4 vs CLI 2.4.5 — run `biome migrate`), remaining diagnostics. Verify: `bun run check` clean.
- **T0.4 Define repeat-owner auth.** Blocked by: none (parallel with T0.1). Login loader distinguishes *owner returning* from *second user claiming*; server hook keeps rejecting second users; cover first-claim / owner-return / second-user-rejected with integration tests.

### Phase 1 — Deployable persistence (ROADMAP M1)

- **T1.1 ADR + bindings.** Blocked by: T0.3. Record D1 decision; add D1 (+ R2 bucket placeholder) bindings to `wrangler.jsonc`; regenerate env typings.
- **T1.2 Per-request DB client.** Blocked by: T1.1. Replace `src/db/index.ts` direct `better-sqlite3` construction with a client factory that resolves the D1 binding per request on Workers and local D1/file in dev. Migrate better-auth to the D1 adapter.
- **T1.3 Migration hygiene.** Blocked by: T1.2. Regenerate Drizzle journal from `full-schema.ts`, drop the `todos` scaffold table, apply from empty DB, document `db:*` commands. Verify: fresh `db:migrate` + authenticated smoke test on `wrangler dev`.
- **T1.4 Deploy pipeline.** Blocked by: T1.3. Documented preview/prod deploy with binding + secret validation; one successful preview deploy with login + dashboard load.

### Phase 2 — Post management (ROADMAP M2)

- **T2.1 Posts list + create-draft.** Blocked by: T0.4, T1.2. Replace `/posts` placeholder with owner-scoped list (exclude soft-deleted) + create-draft flow. Verify: owner CRUD smoke tests.
- **T2.2 Schema for publishing.** Blocked by: T2.1. Add `description`, `publishedAt`, `scheduledAt`, per-user unique slug index, status check constraint (`draft|published|scheduled|archived`). Migration + backfill-safe defaults.
- **T2.3 Rich editor (D3).** Blocked by: T2.2. TipTap editor at `/posts/$postId`, autosave via `savePostBody`, server-side word count from canonical body, positive-only activity recording. Cover `countWords`/`updatePostBody` with unit + integration tests.
- **T2.4 Metadata + preview.** Blocked by: T2.3. Title/slug/SEO fields with validation (D4), live preview overlay, duplicate-slug rejection.
- **T2.5 Lifecycle actions.** Blocked by: T2.4. Publish/unpublish, soft-delete/restore, purge (irreversible confirm), bulk ops. Verify: lifecycle integration tests incl. dashboard + feed exclusion of soft-deleted.

### Phase 3 — Media + public delivery (ROADMAP M3)

- **T3.1 R2 uploads (D5).** Blocked by: T1.2, T2.3. Owner-authorized presigned upload initiation, MIME/size validation, metadata row on `media`. Secrets stay server-side.
- **T3.2 Media library.** Blocked by: T3.1. Searchable asset grid, insert-into-post, delete policy that never leaves published posts with broken images.
- **T3.3 Public JSON feed.** Blocked by: T2.5, T3.1. `GET /api/posts` + `GET /api/posts/$slug`, CORS allowlist from settings, published-only, safe asset URLs. Verify: allowed-origin 200, disallowed-origin blocked, drafts absent.

### Phase 4 — Settings + insights (ROADMAP M4)

- **T4.1 Settings page.** Blocked by: T2.1. Owner form for identity, accent, timezone, CORS origins, model, writing profile, R2/Umami config — validated, persisted, applied by dependents.
- **T4.2 Dashboard completion.** Blocked by: T2.5, T4.1. Re-verify totals/continue-writing/heatmap against real activity; fix dead `/posts` links to real destinations; end-to-end dashboard states.
- **T4.3 Umami.** Blocked by: T4.1. Owner-only analytics surface from `umamiShareUrl`; nothing public until configured.

### Phase 5 — AI + automation (ROADMAP M5)

- **T5.1 AI generation (D7).** Blocked by: T2.3, T4.1. Streamed drafting from writing profile, cancel/error states, explicit save — never auto-publish.
- **T5.2 Repurpose.** Blocked by: T5.1. Twitter/LinkedIn/Instagram/Reels variants, copyable, source post untouched.
- **T5.3 Scheduling (D6).** Blocked by: T1.4, T2.5, T4.1. `scheduledAt` UI + Cron promoter, idempotent, timezone-correct, exactly-once promotion tests.

### Phase 6 — Optional (ROADMAP M6)

- **T6.1 Comments policy → implementation.** Only if D8 is revisited. Policy record first (actors, moderation, spam, retention), then the approved workflow.

## 4. Execution order

```
T0.1 ─┬─▶ T0.2 ─▶ T0.3 ─▶ T1.1 ─▶ T1.2 ─┬─▶ T1.3 ─▶ T1.4 ──┐
      │                                  │                  │
T0.4 ─┴──────────────────────────────────┘                  │
      │                                                     ▼
      └─▶ T2.1 ─▶ T2.2 ─▶ T2.3 ─┬─▶ T2.4 ─▶ T2.5 ─┬─▶ T3.3   │
                                │                 │          │
                    ┌───────────┘                 └─▶ T4.2   │
                    ▼                                        │
              T3.1 ─▶ T3.2 ───────────────────────────────▶ ┘
                    │
T4.1 (after T2.1) ──┼─▶ T4.3
                    └─▶ T5.1 ─▶ T5.2
T1.4+T2.5+T4.1 ─▶ T5.3
```

Parallelizable any time: marketing polish, command palette, RSS, accessibility pass (all deferred enhancements — never on the critical path).

## 5. Test strategy

- **Unit (Vitest, co-located `*.test.ts`):** pure rules — status normalization, accent validation, slug validation, word counting, heatmap bucketing, feed serialization.
- **Integration (Vitest + throwaway DB):** server functions and lifecycle transitions against a fresh migrated DB — auth claim rules, post lifecycle, activity accumulation (positive-only), feed CORS + visibility.
- **Manual smoke (no creds in CI):** OAuth claim flow, R2 upload, Umami embed, Cron promotion on preview.
- **Gates — every ticket ends with:** `bun run test` ✓, `bunx tsc --noEmit` ✓, `bun run check` ✓, `bun run build` ✓. No ticket merges red.

## 6. Data & migration rules

- All schema changes via Drizzle (`db:generate` → review SQL → `db:migrate`); never hand-edit applied migrations.
- Backfill-safe defaults for new NOT NULL columns; destructive changes (dropping `todos`) ship as their own migration.
- Seed script for one owner + settings row to make fresh-environment smoke tests one command.

## 7. Risks

| Risk | Mitigation |
|------|------------|
| D1 migration fans out to all server code + better-auth adapter | T1.2 is a dedicated slice; keep a `db` accessor seam so call sites don't change per environment |
| `env.ts` reads `process.env` — Workers use bindings | Resolve env per request (Workers context) with local fallback; validate at boot |
| Editor body format chosen late corrupts word counts | Lock D3 in T2.2 at the latest; server derives counts, client never sends them |
| Scope creep (comments, palette, RSS) | Explicitly out of v1; ROADMAP Deferred list is the parking lot |

## 8. Rough effort (one focused session ≈ one ticket)

Phase 0: 3–4 · Phase 1: 3–4 · Phase 2: 5–6 · Phase 3: 3 · Phase 4: 3 · Phase 5: 3–4 · Total ≈ **20–25 sessions** to a deployed v1 (feed + media + settings + AI + scheduling, comments excluded).

## 9. Definition of done

Per ticket: behavior demoable on a fresh DB, owner-authorized, validated, covered per §5, gates green, ROADMAP checkbox ticked, IMPLEMENTATION-STATUS updated when the baseline moves. v1 ships when T5.3 is done and a preview deploy passes the smoke list in T1.4.
