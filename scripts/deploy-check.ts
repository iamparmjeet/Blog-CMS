import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const PLACEHOLDER_ID = "00000000-0000-0000-0000-000000000000";
const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const REQUIRED_SECRETS = [
	"BETTER_AUTH_SECRET",
	"BETTER_AUTH_URL",
	"GITHUB_CLIENT_ID",
	"GITHUB_CLIENT_SECRET",
	"GOOGLE_CLIENT_ID",
	"GOOGLE_CLIENT_SECRET",
];

const OPTIONAL_SECRETS = [
	"R2_ACCOUNT_ID",
	"R2_ACCESS_KEY_ID",
	"R2_SECRET_ACCESS_KEY",
	"R2_BUCKET_NAME",
	"R2_PUBLIC_URL",
	"UMAMI_URL",
	"OPENROUTER_API_KEY",
];

export type WranglerConfig = {
	d1_databases?: Array<{
		binding?: string;
		database_name?: string;
		database_id?: string;
	}>;
	r2_buckets?: Array<{ binding?: string; bucket_name?: string }>;
};

export function parseWranglerJsonc(raw: string): WranglerConfig {
	const withoutComments = raw
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.replace(/^\s*\/\/.*$/gm, "");
	return JSON.parse(withoutComments) as WranglerConfig;
}

export type DeployCheckResult = {
	ok: boolean;
	errors: string[];
	warnings: string[];
};

export function runDeployCheck(config: WranglerConfig): DeployCheckResult {
	const errors: string[] = [];
	const warnings: string[] = [];

	const d1 = config.d1_databases?.find((db) => db.binding === "DB");
	if (!d1) {
		errors.push('wrangler.jsonc is missing a D1 binding named "DB".');
	} else {
		const id = d1.database_id ?? "";
		if (id === PLACEHOLDER_ID) {
			errors.push(
				'D1 "DB" database_id is still the all-zero placeholder. Run `bunx wrangler d1 list` / `d1 create blog-cms` and paste the real UUID.',
			);
		} else if (!UUID_RE.test(id)) {
			errors.push(
				`D1 "DB" database_id is not a valid UUID: ${JSON.stringify(id)}.`,
			);
		}
		if (!d1.database_name) {
			warnings.push('D1 "DB" has no database_name.');
		}
	}

	const r2 = config.r2_buckets?.find((bucket) => bucket.binding === "MEDIA");
	if (!r2) {
		errors.push('wrangler.jsonc is missing an R2 binding named "MEDIA".');
	} else if (!r2.bucket_name) {
		errors.push('R2 "MEDIA" binding has no bucket_name.');
	}

	return { ok: errors.length === 0, errors, warnings };
}

function main() {
	const configPath = resolve(process.cwd(), "wrangler.jsonc");
	const raw = readFileSync(configPath, "utf8");
	const result = runDeployCheck(parseWranglerJsonc(raw));

	for (const warning of result.warnings) {
		console.warn(`warning: ${warning}`);
	}
	for (const error of result.errors) {
		console.error(`error: ${error}`);
	}

	console.log("Required secrets (set via `bunx wrangler secret put <NAME>`):");
	for (const name of REQUIRED_SECRETS) {
		console.log(`  - ${name}`);
	}
	console.log("Optional secrets:");
	for (const name of OPTIONAL_SECRETS) {
		console.log(`  - ${name}`);
	}

	if (!result.ok) {
		console.error("deploy:check failed.");
		process.exit(1);
	}
	console.log("deploy:check passed.");
}

if (import.meta.main) {
	main();
}
