# Implementation Status

**Assessed:** 2026-09-19

This baseline is based on the current tracked source, README commitments, and local verification. It is not a product specification; `docs/ROADMAP.md` is the implementation plan.

## Summary

ContentOS has a usable visual shell and early server-side foundations, but it is not yet a functional CMS. The project is approximately **20% complete** against the feature set described in `README.md`.

| Area | Status | Current state |
| --- | --- | --- |
| Marketing site | Implemented | Static landing page sections are present. |
| Authentication | Partial | OAuth configuration, session helpers, and a protected route exist. The owner can always sign back in (welcome-back login); only a second distinct user is rejected by the server hook. |
| Ownership model | Partial | D2 settled: owner return allowed, second distinct user rejected. First-claim / owner-return / rejection covered by unit + throwaway-DB integration tests. |
| Database model | Partial | Tables exist for settings, posts, media, and writing activity. No enforced post-status or per-user slug constraints are present. |
| Dashboard | Partial | UI, post summaries, and writing-activity reads exist. T0.1–T0.3 landed on `main`: archived/unknown status contract, dead activity modules removed, static checks green. |
| Post editing | Foundation only | A server function can save a body and record added words; the posts route is a placeholder and no editor UI exists. |
| Media | Schema only | Media metadata and R2 environment variables exist; no upload, storage, or library behavior exists. |
| AI writing | Not implemented | No OpenRouter configuration or generation/repurposing flow exists. |
| Settings | Schema only | Preference fields exist without an owner-facing settings workflow. |
| Analytics | Schema only | An Umami share URL field exists without an analytics page or integration. |
| Public API | Not implemented | Only the Better Auth API route exists; published-post feed routes are absent. |
| Comments | Not implemented | No comment model or UI exists. |
| Scheduling | Not implemented | `scheduled` is represented in the dashboard but has no publish-at data or scheduler. |
| Deployment | Blocked | D1 (`DB`) and R2 (`MEDIA`) bindings are declared, but the configured Worker still uses `better-sqlite3`, which cannot run in a Cloudflare Worker. T1.2 must migrate the application and auth client to D1. |

## Verified Baseline

| Check | Result | Notes |
| --- | --- | --- |
| `bun run build` | Passes | Generates a client and Worker bundle. A successful bundle does not prove the production database can run on Workers. |
| `bun run test` | Passes | 22/22, including the dashboard status-contract and owner-claim (first-claim/return/rejection) cases. |
| `bun run check-types` | Passes | 0 errors (13→2→0 across T0.2 and T0.3). |
| `bun run check` | Passes | Biome 2.4.5 clean on 86 files; config migrated, 5 suppressions with written reasons. |
| pre-push hooks | Enforcing | lefthook: `biome-changed` ✔, `typecheck` ✔, and `production-build` ✔ on main pushes. No bypass needed since T0.3. |
| CI (main-only) | Green | `push→main` + `pull_request→main`; first green run (`35377014193`) after the T0 stack merged and `lefthook` was declared as a devDependency. |

## Immediate Repair Scope

The T0 baseline repair is complete (T0.1–T0.3 merged, all four gates green on `main`). Remaining before new product features:

- T0.4 done on branch (owner return allowed, second user rejected, login distinguishes claim from return, M0 ticked). Merge pending; next is product work starting at T1.1.

## Tooling (added 2026-09-18)

- `AGENTS.md` (131 words, WDS-style) + `CLAUDE.md` symlink; links `@CONTEXT.md`, `@COMMITS.md`, roadmap/plan/status, delivery conventions.
- `COMMITS.md` + commitlint + lefthook (`pre-commit` biome, `commit-msg` lint, `pre-push` typecheck/lint/build). Scripts: `check-types`, `check` (`biome check .`), `check:fix`.
- `lefthook` declared as a devDependency (`3482c00`); the `prepare` script previously relied on a machine-global binary, which failed CI installs.
- `.github/workflows/ci.yml` (main-only triggers), `.release-it.json` (`npm.publish:false`), `opencode.jsonc` (playwright), `.opencode/commands/verify.md`.
- Hygiene commits: `de89bb0`/`6bd8d01` chore(tooling), `21fbd40` docs(agent). `dev.db` untracked, `.cursorrules` removed.

## Documentation Caveat

The README describes a much more complete product than the source implements. Its migration warning is also out of date: the current Drizzle journal contains only the `0000_curly_black_tarantula` migration, not the referenced missing `0004` entry.
