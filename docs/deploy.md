# Deployment

ContentOS deploys to Cloudflare Workers. Preview and production use the same
`wrangler.jsonc` bindings; secrets stay out of the config file.

## Prerequisites

- `bun` 1.4+
- Cloudflare account with Workers, D1, and R2 enabled
- OAuth apps for GitHub and Google (callback URL set to your deploy origin)
- An R2 bucket for media (optional in local dev)

## Authenticate

OAuth is the default path. An API token (even an empty placeholder) blocks it,
so unset it first:

```bash
unset CLOUDFLARE_API_TOKEN
bunx wrangler login
bunx wrangler whoami
```

Confirm the account ID before any remote command.

## Bindings (declared in `wrangler.jsonc`)

| Binding | Type | Purpose |
| --- | --- | --- |
| `DB` | D1 | Relational store (posts, settings, media metadata, auth) |
| `MEDIA` | R2 | Object storage for uploaded media |

The `DB` entry must carry the real remote `database_id` (never a placeholder
UUID). The `MEDIA` bucket name must match the bucket you provision.

## Secrets (set with `wrangler secret put`)

Required for a working authenticated deploy:

| Secret | Purpose |
| --- | --- |
| `BETTER_AUTH_SECRET` | Session signing secret (long random string) |
| `BETTER_AUTH_URL` | Public base URL of the deployment, e.g. `https://blog-cms.example.workers.dev` |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth |

R2 presign credentials (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
`R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`) are server-side
environment values used for direct-upload verification. Set them as secrets
when media uploads must work on the deploy:

```bash
bunx wrangler secret put R2_ACCOUNT_ID
bunx wrangler secret put R2_ACCESS_KEY_ID
bunx wrangler secret put R2_SECRET_ACCESS_KEY
bunx wrangler secret put R2_BUCKET_NAME
bunx wrangler secret put R2_PUBLIC_URL
```

Optional: `UMAMI_URL` (and related `UMAMI_*` vars) for analytics. Optional:
`OPENROUTER_API_KEY` / `OPENROUTER_KEY` for AI features (not required for a
deployment smoke test).

Never commit `.env` or secret values. `.env.local` is gitignored — and never
copy it to `.env`. Local files never reach the Worker; instead pipe each value
straight into Cloudflare (nothing is printed or committed):

```bash
set -a; . /path/to/.env.local; set +a
printf '%s' "$BETTER_AUTH_SECRET" | bunx wrangler secret put BETTER_AUTH_SECRET
printf '%s' "https://<your-worker>.workers.dev" | bunx wrangler secret put BETTER_AUTH_URL
# …repeat for GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
```

`BETTER_AUTH_URL` must be the deployment origin (not `localhost`) or login
redirects will point at the wrong host.

## Environment / binding validation

Before deploying, run the lightweight checker:

```bash
bun run deploy:check
```

It verifies that:

- `wrangler.jsonc` declares `DB` (D1) and `MEDIA` (R2) bindings
- `database_id` is a real UUID (not the all-zero placeholder)
- required secret names are documented (values are never read or printed)

Runtime schema validation of required server env vars lives in `src/env.ts`
(`@t3-oss/env-core` + Zod) and fails fast when the Worker boots with missing
required values.

## Remote D1

Local D1 state is not shared with Cloudflare. Provision once:

```bash
bunx wrangler d1 list
bunx wrangler d1 create blog-cms   # skip if it already exists; capture database_id
```

Put the printed `database_id` into `wrangler.jsonc`
(`d1_databases[0].database_id`). Then apply and inspect:

```bash
bun run db:migrate:remote
bunx wrangler d1 info blog-cms
bunx wrangler d1 migrations list blog-cms --remote
```

## Preview deployment

Preview is a Workers deploy of the current branch build to the
`workers.dev` URL (no separate `preview` env is configured in
`wrangler.jsonc`, so preview and production share the same deploy path):

```bash
bun run deploy:preview
```

This runs `bun run build && wrangler deploy`. After it finishes, smoke-test
the URL it prints:

```bash
# marketing page (no auth)
curl -sS -o /dev/null -w '%{http_code}\n' "$PREVIEW_URL/"

# authenticated shell (expects a session cookie; 200 when signed in,
# redirect/401 otherwise — both prove the Worker is serving, not a static 404)
curl -sS -o /dev/null -w '%{http_code}\n' -L "$PREVIEW_URL/dashboard"
```

The acceptance criterion is that a preview deployment supports an authenticated
smoke test without native SQLite dependencies — the Worker uses the `DB` D1
binding only.

## Production deployment

```bash
bun run deploy
```

This is `bun run build && wrangler deploy`. Confirm `bunx wrangler whoami`
points at the intended account first.

## Post-deploy checklist

1. `bunx wrangler whoami` — correct account.
2. `bun run deploy:check` — bindings + placeholder id clear.
3. `bun run db:migrate:remote` — schema current.
4. Open the deployment URL; sign in once to claim the instance.
5. Hit `/api/posts` (CORS-gated) from an allowlisted origin if feed access matters.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| OAuth login opens but fails | Unset `CLOUDFLARE_API_TOKEN` and re-run `bunx wrangler login`. |
| `duplicate column` during migrate | Migration already applied; `bun run db:migrate:remote` is idempotent — check `d1 migrations list`. |
| Placeholder `database_id` | Run `d1 create`/`d1 list`, paste the real UUID into `wrangler.jsonc`. |
| Media upload 5xx on deploy | Set `R2_*` secrets and confirm the bucket name matches `wrangler.jsonc`. |
