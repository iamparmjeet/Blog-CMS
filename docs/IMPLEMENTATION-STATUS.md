# Implementation Status

**Assessed:** 2026-09-18

This baseline is based on the current tracked source, README commitments, and local verification. It is not a product specification; `docs/ROADMAP.md` is the implementation plan.

## Summary

ContentOS has a usable visual shell and early server-side foundations, but it is not yet a functional CMS. The project is approximately **20% complete** against the feature set described in `README.md`.

| Area | Status | Current state |
| --- | --- | --- |
| Marketing site | Implemented | Static landing page sections are present. |
| Authentication | Partial | OAuth configuration, session helpers, and a protected route exist. The login flow currently blocks all sign-ins after an owner exists. |
| Ownership model | Partial | The first-user claim guard exists in the auth hook. Repeat-owner access needs a clear, working rule. |
| Database model | Partial | Tables exist for settings, posts, media, and writing activity. No enforced post-status or per-user slug constraints are present. |
| Dashboard | Partial | UI, post summaries, and writing-activity reads exist. T0.1–T0.3 are complete on stacked branches with all gates green at the stack top; `main` stays red until the stack merges bottom-up. |
| Post editing | Foundation only | A server function can save a body and record added words; the posts route is a placeholder and no editor UI exists. |
| Media | Schema only | Media metadata and R2 environment variables exist; no upload, storage, or library behavior exists. |
| AI writing | Not implemented | No OpenRouter configuration or generation/repurposing flow exists. |
| Settings | Schema only | Preference fields exist without an owner-facing settings workflow. |
| Analytics | Schema only | An Umami share URL field exists without an analytics page or integration. |
| Public API | Not implemented | Only the Better Auth API route exists; published-post feed routes are absent. |
| Comments | Not implemented | No comment model or UI exists. |
| Scheduling | Not implemented | `scheduled` is represented in the dashboard but has no publish-at data or scheduler. |
| Deployment | Blocked | The configured Worker would use `better-sqlite3`, which cannot run in a Cloudflare Worker. No D1 binding is configured. |

## Verified Baseline

| Check | Result | Notes |
| --- | --- | --- |
| `bun run build` | Passes | Generates a client and Worker bundle. A successful bundle does not prove the production database can run on Workers. |
| `bun run test` | Fails on `main` | Red on `main` (dashboard status-contract failure). Green 12/12 at the top of the T0 stack — T0.1 fixed the contract. Goes green on `main` when the stack merges. |
| `bun run check-types` | Fails on `main` | 13-error baseline owned by T0.1–T0.3. Clean (0 errors) at the stack top: T0.1 fixed the contract return, T0.2 deleted the dead modules (13→2), T0.3 fixed the auth-client import and unused React (2→0). |
| `bun run check` | Fails on `main` | Biome 2.4.5 drift + source diagnostics on `main`. Clean at the stack top after T0.3 (config migrated, autofix applied, 7 justified suppressions with reasons). |
| pre-push hooks | Enforcing | lefthook: `biome-changed` ✔, `production-build` ✔, `typecheck` blocks pushes while red (known T0 baseline). |
| CI (main-only) | Added | `push→main` + `pull_request→main`; expected red until T0.1–T0.3 land. |

## Immediate Repair Scope

Before new product features, restore a clean baseline:

- Resolve the dashboard status contract and make its tests pass.
- Remove or migrate obsolete writing-activity modules and imports.
- Separate the dashboard summary type from the summary plus activity response type.
- Fix the stale auth-client import and unused type imports.
- Align Biome configuration with the installed CLI and resolve the reported checks.
- Decide whether the owner can re-authenticate, then make the login screen and server enforcement match that rule.

## Tooling (added 2026-09-18)

- `AGENTS.md` (131 words, WDS-style) + `CLAUDE.md` symlink; links `@CONTEXT.md`, `@COMMITS.md`, roadmap/plan/status, delivery conventions.
- `COMMITS.md` + commitlint + lefthook (`pre-commit` biome, `commit-msg` lint, `pre-push` typecheck/lint/build). Scripts: `check-types`, `check` (`biome check .`), `check:fix`.
- `.github/workflows/ci.yml` (main-only triggers), `.release-it.json` (`npm.publish:false`), `opencode.jsonc` (playwright), `.opencode/commands/verify.md`.
- Hygiene commits: `de89bb0`/`6bd8d01` chore(tooling), `21fbd40` docs(agent). `dev.db` untracked, `.cursorrules` removed.

## Documentation Caveat

The README describes a much more complete product than the source implements. Its migration warning is also out of date: the current Drizzle journal contains only the `0000_curly_black_tarantula` migration, not the referenced missing `0004` entry.
