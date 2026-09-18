# Commit Message Reference

## Format

type(scope): description

## Types

feat → new feature
fix → bug fix
refactor → no behavior change, better shape
chore → deps, config, tooling
style → formatting only (biome, whitespace)
build → Cloudflare, wrangler, drizzle config

## Scopes

db · auth · posts · editor · media · feed · settings · dashboard · ai · deploy

## Examples

feat(posts): add draft list with soft-delete filter
fix(dashboard): keep unknown status distinguishable from draft
refactor(db): extract per-request client factory
chore(deps): add commitlint and lefthook commit-msg hook

## Rule

If your message needs "and" → split the commit
CSS stays with its component, not a separate commit
