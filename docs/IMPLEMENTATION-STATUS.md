# Implementation Status

**Assessed:** 2026-09-20

This baseline is based on the current tracked source, README commitments, and local verification. It is not a product specification; `docs/ROADMAP.md` is the implementation plan.

## Summary

ContentOS has a usable visual shell and early server-side foundations, but it is not yet a functional CMS. The project is approximately **20% complete** against the feature set described in `README.md`.

| Area | Status | Current state |
| --- | --- | --- |
| Marketing site | Implemented | Static landing page sections are present. |
| Authentication | Partial | OAuth configuration, session helpers, and a protected route exist. The owner can always sign back in (welcome-back login); a second distinct user is rejected by the server hook and an atomic database constraint, then returned to the claimed-instance login state. |
| Ownership model | Partial | D2 settled: owner return allowed, second distinct user rejected. First-claim / owner-return / rejection covered by unit + throwaway-DB integration tests; the database invariant also prevents concurrent second claims. |
| Database model | Partial | Tables exist for settings, posts, media, and writing activity, and server code reaches them through a per-request `drizzle-orm/d1` client. Posts enforce valid lifecycle statuses and per-owner slug uniqueness. |
| Dashboard | Partial | UI, post summaries, and writing-activity reads exist. Invalid post statuses are data-integrity errors; `unknown` was removed after the posts constraint landed. |
| Post editing | Partial | The owner-scoped posts list (soft-deleted posts excluded) and create-draft flow are implemented at `/posts`; a server function can save a body and record added words. No editor UI exists yet. |
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
| `bun run test` | Passes | 42/42, including post-status, per-owner slug-constraint, owner-claim, and owner-scoping cases. |
| `bun run check-types` | Passes | 0 errors. |
| `bun run check` | Passes | Biome 2.4.5 clean on 99 files; config migrated, 5 suppressions with written reasons. |
| `bunx wrangler types --check` | Passes | `worker-configuration.d.ts` matches the declared `DB` and `MEDIA` bindings. |
| pre-push hooks | Enforcing | lefthook: `biome-changed` ✔, `typecheck` ✔, and `production-build` ✔ on main pushes. No bypass needed since T0.3. |
| CI (main-only) | Green | `push→main` + `pull_request→main`; first green run (`35377014193`) after the T0 stack merged and `lefthook` was declared as a devDependency. |

## Immediate Repair Scope

The T0 baseline repair is complete; M1.1/T1.2/T1.3 and M2.1/M2.2 are merged or ready to merge:

- The Drizzle journal is a single regenerated baseline from `full-schema.ts`; the `todos` scaffold table is gone and the baseline applies from an empty local D1 (`0000_small_scourge.sql`).
- `bun run db:migrate` now applies through Wrangler (`wrangler d1 migrations apply`); `drizzle-kit` generates SQL only.
- `/posts` lists the owner's non-deleted posts and creates untitled drafts. The posts schema includes description plus publish/schedule timestamps, rejects invalid lifecycle statuses and duplicate owner slugs, and archives invalid legacy statuses during migration.
- The rich editor arrives with M2.3.
- Remaining before deployment: T1.4 deploy verification (provision D1/R2, replace the placeholder database ID, preview smoke).

## Local Worker State

- Cloudflare's Vite plugin can deadlock during Worker export initialization when it persists Miniflare SQLite state under this repository's Btrfs-backed `.wrangler/state` directory.
- `vite.config.ts` uses the plugin's supported `persistState.path` option to store local Worker state under `$XDG_RUNTIME_DIR/contentos-wrangler-state`, falling back to `/tmp/contentos-wrangler-state`. Set `CLOUDFLARE_LOCAL_STATE_PATH` to override the location.
- `bun run db:migrate` uses the same state path as Vite. The runtime directory is cleared after reboot, so run the migration command before starting the dev server in a new session.

## Tooling (added 2026-09-18)

- `AGENTS.md` (131 words, WDS-style) + `CLAUDE.md` symlink; links `@CONTEXT.md`, `@COMMITS.md`, roadmap/plan/status, delivery conventions.
- `COMMITS.md` + commitlint + lefthook (`pre-commit` biome, `commit-msg` lint, `pre-push` typecheck/lint/build). Scripts: `check-types`, `check` (`biome check .`), `check:fix`.
- `lefthook` declared as a devDependency (`3482c00`); the `prepare` script previously relied on a machine-global binary, which failed CI installs.
- `.github/workflows/ci.yml` (main-only triggers), `.release-it.json` (`npm.publish:false`), `opencode.jsonc` (playwright), `.opencode/commands/verify.md`.
- Hygiene commits: `de89bb0`/`6bd8d01` chore(tooling), `21fbd40` docs(agent). `dev.db` untracked, `.cursorrules` removed.

## Documentation Caveat

The README describes a much more complete product than the source implements. The migration warning it carried is resolved: T1.3 regenerated a single clean baseline, so the missing `0004` journal entry no longer applies.
