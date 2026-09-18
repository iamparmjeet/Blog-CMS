# Delivery conventions

Read this only when submitting a PR or finishing a ticket. Do not load it for exploration or planning.

## Verify (in order, stop on first red)

```bash
bun run test
bun run check-types
bun run check
bun run build
```

`main` must be green on all four before merge. If a check was already red on `main`, note it in the PR — do not bundle unrelated fixes.

## Commits

Conventional commits enforced by lefthook + commitlint (see @COMMITS.md).
Format: `type(scope): description`. If it needs "and" → split the commit.

## PR shape

- One ticket slice per PR (e.g. T0.1, not Phase 0). Reference the ticket + milestone (e.g. `T0.1 / M0.1`).
- Update `docs/ROADMAP.md` checkboxes and `docs/IMPLEMENTATION-STATUS.md` baseline in the same PR.
- Summarize implementation, tests, and follow-up work in the PR body. No screenshots for backend-only changes.

## Never do

- Never weaken Biome rules or add `// @ts-ignore` to make a check pass.
- Never auto-publish, auto-migrate prod data, or commit `.env` / secrets.
