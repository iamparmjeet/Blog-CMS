# AGENTS.md

ContentOS is a single-owner blog CMS — owner writes/publishes posts served via a CORS-gated public feed on Cloudflare Workers (TanStack Start + Drizzle + better-auth).

- Package manager is `bun`. Do not suggest `npm`/`pnpm` commands.
- Keep `main` type-checking, test-green, and Biome-clean after every change.

High-level layout: `src/routes/` route shells, `src/features/` domain logic, `src/db/` schema + client, `src/components/` shared UI, `docs/` plans.

References (read only the one you need for the current task):

- Domain terms + lifecycle rules: @docs/CONTEXT.md
- Milestone checkboxes (tracking surface): @docs/ROADMAP.md
- Ticket slices + decisions D1-D8: @docs/IMPLEMENTATION-PLAN.md
- Current baseline + red checks: @docs/IMPLEMENTATION-STATUS.md
- Commit format + scopes: @COMMITS.md
- When submitting a PR or finishing a ticket: @docs/conventions/delivery.md

Do not add new conventions preemptively. Only propose an AGENTS.md/docs change after the agent repeats the same mistake twice.
