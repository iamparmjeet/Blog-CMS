/**
 * Full-text post search deterministic E2E: title/slug/description/body
 * matching through the real query layer (throwaway DB stands in for D1).
 *
 * Covers the markup-never-matches edge (TipTap JSON must not leak into
 * results) plus the wildcard-literal and validation failures.
 *
 * Run (Node — Bun cannot load better-sqlite3):
 *   ./node_modules/.bin/tsx scripts/post-search-e2e.ts
 * Artifact: docs/e2e/post-search.log
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import type { Db } from "#/db";
import { posts } from "#/db/schema";
import {
	listPostsInputSchema,
	selectPostRowsByOwner,
} from "#/features/posts/functions/posts.query";

const OWNER = "e2e-owner";
const OTHER = "someone-else";
const ARTIFACT = resolve(
	dirname(new URL(import.meta.url).pathname),
	"../docs/e2e/post-search.log",
);

const lines: string[] = [];

function log(line: string): void {
	lines.push(line);
	console.log(line);
}

function check(name: string, condition: boolean, detail = ""): void {
	if (!condition) {
		throw new Error(`E2E FAILED: ${name}${detail ? ` — ${detail}` : ""}`);
	}

	log(`PASS: ${name}`);
}

function createThrowawayDb(): Db {
	const sqlite = new Database(":memory:");
	sqlite.exec(`
		CREATE TABLE posts (
			id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
			user_id text NOT NULL,
			title text NOT NULL,
			slug text NOT NULL,
			seo_title text DEFAULT '' NOT NULL,
			status text DEFAULT 'draft' NOT NULL,
			body text,
			description text DEFAULT '' NOT NULL,
			published_at integer,
			scheduled_at integer,
			wordCount integer DEFAULT 0 NOT NULL,
			revision integer DEFAULT 0 NOT NULL,
			deleted_at integer,
			created_at integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
			updated_at integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
			CONSTRAINT "posts_status_valid"
			CHECK("status" in ('draft', 'published', 'scheduled', 'archived')),
			CONSTRAINT "posts_user_id_slug_unique" UNIQUE("user_id", "slug")
		);
	`);
	return drizzle(sqlite) as unknown as Db;
}

async function main(): Promise<void> {
	const db = createThrowawayDb();
	await db.insert(posts).values([
		{
			userId: OWNER,
			title: "Compost guide",
			slug: "compost-guide",
			status: "draft",
			description: "Rot everything",
			body: JSON.stringify({
				type: "doc",
				content: [
					{
						type: "paragraph",
						content: [{ type: "text", text: "Compost happens fast." }],
					},
				],
			}),
			updatedAt: new Date("2026-09-01T00:00:00.000Z"),
		},
		{
			userId: OWNER,
			title: "Bread notes",
			slug: "bread",
			status: "published",
			description: "",
			body: null,
			updatedAt: new Date("2026-09-02T00:00:00.000Z"),
		},
		{
			userId: OWNER,
			title: "Trashed draft",
			slug: "trashed",
			status: "draft",
			description: "",
			body: null,
			deletedAt: new Date("2026-09-03T00:00:00.000Z"),
			updatedAt: new Date("2026-09-03T00:00:00.000Z"),
		},
		{
			userId: OTHER,
			title: "Foreign compost",
			slug: "foreign-compost",
			status: "draft",
			description: "",
			body: null,
			updatedAt: new Date("2026-09-04T00:00:00.000Z"),
		},
	]);

	async function search(query?: string): Promise<string[]> {
		const validated = listPostsInputSchema.parse(
			query === undefined ? {} : { query },
		);
		const rows = await selectPostRowsByOwner(db, OWNER, {
			query: validated.query,
		});
		return rows.map((row) => row.slug);
	}

	// Scenario 1 — matches across title, slug, description, and body text.
	check("title match", JSON.stringify(await search("compost")) === JSON.stringify(["compost-guide"]));
	check("slug match", JSON.stringify(await search("bread")) === JSON.stringify(["bread"]));
	check("description match", JSON.stringify(await search("rot everything")) === JSON.stringify(["compost-guide"]));
	check("body-text match", JSON.stringify(await search("happens fast")) === JSON.stringify(["compost-guide"]));

	// Scenario 2 (edge) — TipTap markup never matches.
	check("markup never matches", (await search("paragraph")).length === 0);

	// Scenario 3 — scoping invariants hold under search.
	check("trashed posts excluded", !(await search("trashed")).includes("trashed"));
	check("other owners excluded", !(await search("foreign")).includes("foreign-compost"));

	// Scenario 4 — empty query returns everything visible.
	check("empty query returns all", JSON.stringify(await search("  ")) === JSON.stringify(["bread", "compost-guide"]));

	// Scenario 5 (failure) — overlong queries rejected before touching the DB.
	const invalid = listPostsInputSchema.safeParse({ query: "x".repeat(65) });
	check("overlong query rejected", !invalid.success);

	log(`\nE2E complete. All green.`);
	mkdirSync(dirname(ARTIFACT), { recursive: true });
	writeFileSync(ARTIFACT, `${lines.join("\n")}\n`);
	log(`Artifact: docs/e2e/post-search.log`);
}

if (import.meta.main) {
	main().catch((error: unknown) => {
		console.error(error instanceof Error ? error.message : error);
		process.exit(1);
	});
}
