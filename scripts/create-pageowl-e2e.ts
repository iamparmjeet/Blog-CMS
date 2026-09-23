import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
	existsSync,
	mkdtempSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const temp = mkdtempSync(join(tmpdir(), "pageowl-scaffold-"));
const fixture = join(temp, "source");
const output = join(temp, "project");
const cli = resolve("packages/create-pageowl/bin/create-pageowl.js");
const log: string[] = ["create-pageowl v1.0.0 E2E"];

function git(...args: string[]) {
	const result = spawnSync("git", args, { cwd: fixture, encoding: "utf8" });
	assert.equal(result.status, 0, result.stderr);
}

function runCli(ref = "v1.0.0") {
	return spawnSync(process.execPath, [cli, "project"], {
		cwd: temp,
		encoding: "utf8",
		env: { ...process.env, PAGEOWL_REPOSITORY: fixture, PAGEOWL_REF: ref },
	});
}

try {
	mkdirSync(fixture);
	writeFileSync(
		join(fixture, "wrangler.jsonc"),
		JSON.stringify({
			name: "blog-cms",
			d1_databases: [
				{
					binding: "DB",
					database_name: "blog-cms",
					database_id: "142c33e3-399b-4eea-9164-10995ce4f115",
				},
			],
			r2_buckets: [{ binding: "MEDIA", bucket_name: "contentos" }],
		}),
	);
	writeFileSync(join(fixture, "README.md"), "# PageOwl fixture\n");
	git("init", "-q");
	git("add", ".");
	git("-c", "user.name=PageOwl E2E", "-c", "user.email=e2e@example.invalid", "commit", "-qm", "fixture");
	git("tag", "v1.0.0");

	const created = runCli();
	assert.equal(created.status, 0, created.stderr);
	const config = JSON.parse(readFileSync(join(output, "wrangler.jsonc"), "utf8"));
	assert.equal(config.d1_databases[0].database_id, "00000000-0000-0000-0000-000000000000");
	assert.equal(config.r2_buckets[0].bucket_name, "contentos");
	assert.ok(existsSync(join(output, "README.md")));
	assert.ok(!existsSync(join(output, ".git")));
	log.push("PASS: tagged clone preserves app files and clears the live D1 ID and Git history");

	const existing = runCli();
	assert.notEqual(existing.status, 0);
	assert.match(existing.stderr, /already exists/);
	assert.ok(existsSync(join(output, "README.md")));
	log.push("PASS: existing target is rejected without changing its files");

	rmSync(output, { recursive: true });
	const missingTag = runCli("v9.9.9");
	assert.notEqual(missingTag.status, 0);
	assert.ok(!existsSync(output));
	log.push("PASS: missing release tag fails without leaving a project directory");
} finally {
	rmSync(temp, { recursive: true, force: true });
}

const artifact = resolve("docs/e2e/create-pageowl.log");
writeFileSync(artifact, `${log.join("\n")}\n`);
console.log(log.join("\n"));
