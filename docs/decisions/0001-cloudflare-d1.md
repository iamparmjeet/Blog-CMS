# ADR 0001: Use Cloudflare D1 for persistence

**Status:** Accepted (2026-09-19)

## Context

ContentOS deploys to Cloudflare Workers, but its current database client uses
`better-sqlite3`. That native Node.js module cannot run in the Workers runtime.
The application needs one relational database model that works locally and in
production without changing query semantics between environments.

## Decision

Use Cloudflare D1 as ContentOS's relational database. T1.2 will create a
per-request Drizzle client with `drizzle-orm/d1`, sourced from the Worker `DB`
binding. Local Worker development will run through Wrangler, which provides a
local D1 binding; this keeps local and production on the same driver.

`wrangler.jsonc` also declares the `MEDIA` R2 binding now. R2 remains unused
until T3.1, but the binding establishes the Worker storage boundary without
putting object-store credentials in application configuration.

The committed D1 identifier is an intentional non-production placeholder.
Before any deployment, provision the D1 database and R2 bucket, replace it
with the database's real ID, and confirm the configured bucket name. T1.4 will
document and validate that deployment procedure.

## Consequences

- T1.2 must migrate every server-side database consumer, including better-auth,
  away from `better-sqlite3`; no production deployment is valid before then.
- D1/R2 bindings are Worker resources, not secrets. OAuth and session secrets
  remain Wrangler secrets and must not enter `wrangler.jsonc`.
- Drizzle remains the schema and migration source. T1.3 will regenerate the
  migration journal and apply migrations from an empty local D1 database.
- Migrations must remain rollback-safe: deploy code compatible with the current
  schema first, prefer additive migrations, and restore from a database backup
  rather than attempting to reverse a destructive migration in place.

## Alternatives considered

- Keep `better-sqlite3`: rejected because Workers cannot load native Node.js
  modules.
- Move to an external Postgres database: rejected for v1 because it adds a
  second infrastructure provider and an edge connectivity layer without a
  current requirement that D1 cannot meet.
