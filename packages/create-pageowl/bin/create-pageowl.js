#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";

const { version } = JSON.parse(
	readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);
const repository =
	process.env.PAGEOWL_REPOSITORY ?? "https://github.com/iamparmjeet/PageOwl.git";
const ref = process.env.PAGEOWL_REF ?? `v${version}`;
const name = process.argv[2];

if (name === "--version") {
	console.log(version);
	process.exit(0);
}

if (name === "--help" || name === "-h") {
	console.log("Usage: create-pageowl <directory>\nCreates a PageOwl project from this package's matching release tag.");
	process.exit(0);
}

if (!name || process.argv.length !== 3 || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(name)) {
	console.error("Usage: create-pageowl <directory> (letters, numbers, dots, underscores, hyphens)");
	process.exit(1);
}

const target = resolve(name);
if (existsSync(target)) {
	console.error(`Directory already exists: ${target}`);
	process.exit(1);
}

const clone = spawnSync("git", ["clone", "--depth", "1", "--branch", ref, repository, target], {
	stdio: "inherit",
});
if (clone.status !== 0) {
	console.error("Could not fetch the matching PageOwl release.");
	process.exit(1);
}

try {
	const configPath = resolve(target, "wrangler.jsonc");
	const config = JSON.parse(readFileSync(configPath, "utf8"));
	const db = config.d1_databases?.find((database) => database.binding === "DB");
	if (!db) throw new Error("Release is missing its D1 binding");
	db.database_id = "00000000-0000-0000-0000-000000000000";
	writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
	rmSync(resolve(target, ".git"), { recursive: true, force: true });
} catch (error) {
	rmSync(target, { recursive: true, force: true });
	console.error(`Could not prepare PageOwl: ${error.message}`);
	process.exit(1);
}

console.log(`\nCreated ${basename(target)} from PageOwl ${ref}.`);
console.log(`Next: cd ${name} && bun install`);
console.log("Copy .env.example to .env.local, then follow README.md and docs/deploy.md.");
console.log("Provision your own D1 database and R2 bucket before deploying; the original D1 ID was cleared.");
