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

## Parallel agents (worktrees)

When multiple independent ticket slices run at once, each slice gets its own agent in its own git worktree so working trees never collide.

### Setup

```bash
# from the main repo checkout (always based on current origin/main)
git worktree add ../Blog-CMS-m4.2 -b feat/m4.2-dashboard
git worktree add ../Blog-CMS-m4.3 -b feat/m4.3-umami
git worktree add ../Blog-CMS-m1.3 -b feat/m1.3-deploy
```

Each agent works only inside its worktree directory, commits only on its branch, runs all four gates there, pushes with `git push -u origin <branch>`, and opens one PR referencing its ticket + milestone (`T4.2 / M4.2`, etc.).

### Division of labor

| Role | Does |
| --- | --- |
| Coordinator (main agent) | Creates worktrees, dispatches slices, reviews PRs, resolves shared-doc conflicts, merges in order. |
| Slice agent (one per worktree) | Implements exactly one ticket, runs gates, commits, pushes, opens its PR. Never touches another worktree or `main`. |

### Shared files

`docs/ROADMAP.md` and `docs/IMPLEMENTATION-STATUS.md` will conflict across parallel PRs. Each agent edits only its own checkboxes/baseline rows. The coordinator rebases or re-resolves those two files when merging subsequent PRs — agents must not invent wholesale rewrites of either doc.

### Teardown

```bash
git worktree remove ../Blog-CMS-<slice>
git branch -D feat/<slice>
```
