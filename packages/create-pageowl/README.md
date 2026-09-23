# create-pageowl

Scaffold a self-hosted PageOwl project from the GitHub release matching this CLI's version. Requires Node.js 20+ and Git; the generated project uses Bun 1.4+.

GitHub Packages requires a GitHub personal access token (classic) with `read:packages` even for a public package. In your user-level `.npmrc`, configure the registry and token (do not commit the token):

```ini
@iamparmjeet:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_PACKAGES_TOKEN}
```

Set `GITHUB_PACKAGES_TOKEN` in your shell, then install and run with Bun:

```bash
bun add --global @iamparmjeet/create-pageowl@1.0.0
create-pageowl my-pageowl
cd my-pageowl
bun install
```

The scaffold resets the repository's D1 database ID to a placeholder, removes its Git history, and does not install dependencies or deploy anything. Read `README.md` and `docs/deploy.md` in the generated directory to provision your own D1, R2 and OAuth secrets before deploying.

Without GitHub Packages authentication, the same versioned source can be cloned directly:

```bash
git clone --branch v1.0.0 https://github.com/iamparmjeet/PageOwl.git my-pageowl
```

When cloning directly, **replace the D1 database ID** in `wrangler.jsonc` before deploying; that file in the source repository names the maintainer's existing database.
