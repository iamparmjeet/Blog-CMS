/**
 * Auto-generated post slug deterministic E2E: creation-time slugification plus
 * the editor's title-following contract (throwaway DB stands in for D1).
 *
 * Covers the collision edge (two drafts with the same title), soft-deleted
 * slug reservations, other-owner scoping, custom-slug opt-out, and the
 * published-post freeze.
 *
 * Run (Node — Bun cannot load better-sqlite3):
 *   ./node_modules/.bin/tsx scripts/auto-slug-e2e.ts
 * Artifact: docs/e2e/auto-slug.log
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import Database from "better-sqlite3";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import type { Db } from "#/db";
import {
	insertPostDraft,
	selectOwnerSlugsExcluding,
} from "#/features/posts/functions/posts.query";
import {
	slugFollowsTitle,
	slugForTitle,
} from "#/features/posts/functions/posts.utils";

const OWNER = "e2e-owner";
const OTHER = "someone-else";
const ARTIFACT = resolve(
	dirname(new URL(import.meta.url).pathname),
	"../docs/e2e/auto-slug.log",
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

	// Two drafts with the same title, one trashed post, one foreign post.
	const first = await insertPostDraft(db, { userId: OWNER, title: "Same Title" });
	const second = await insertPostDraft(db, {
		userId: OWNER,
		title: "Same Title",
	});
	const trashed = await insertPostDraft(db, {
		userId: OWNER,
		title: "Trashed Post",
	});
	await insertPostDraft(db, { userId: OTHER, title: "Same Title" });

	// Soft-deleted rows keep their slug reserved by the unique constraint.
	await db.run(
		sql`UPDATE posts SET deleted_at = ${Date.now()} WHERE id = ${trashed.id}`,
	);

	check("creation slugifies the title", first.slug === "same-title");
	check(
		"creation suffixes a duplicate title",
		second.slug === "same-title-2",
		second.slug,
	);

	const takenForFirst = await selectOwnerSlugsExcluding(db, OWNER, first.id);
	const takenForSecond = await selectOwnerSlugsExcluding(db, OWNER, second.id);

	check(
		"taken slugs exclude the open post",
		!takenForFirst.includes("same-title") &&
			!takenForSecond.includes("same-title-2"),
	);
	check(
		"taken slugs include soft-deleted posts",
		takenForFirst.includes("trashed-post"),
	);
	check(
		"taken slugs exclude other owners",
		takenForFirst.filter((slug) => slug === "same-title").length === 0,
	);

	// The realistic collision: both editors type the same title, and each
	// derives a slug that does not collide with its own reserved row.
	check(
		"first editor derives its own slug",
		slugForTitle("Same Title", new Set(takenForFirst)) === "same-title",
	);
	check(
		"second editor derives the suffixed slug",
		slugForTitle("Same Title", new Set(takenForSecond)) === "same-title-2",
	);

	// Follow/opt-out contract.
	check(
		"untouched draft follows the title",
		slugFollowsTitle({
			title: "Same Title",
			slug: second.slug,
			status: "draft",
			takenSlugs: new Set(takenForSecond),
		}),
	);
	check(
		"custom slug stops following",
		!slugFollowsTitle({
			title: "Same Title",
			slug: "my-custom-url",
			status: "draft",
			takenSlugs: new Set(takenForSecond),
		}),
	);
	check(
		"published posts never follow",
		!slugFollowsTitle({
			title: "Same Title",
			slug: second.slug,
			status: "published",
			takenSlugs: new Set(takenForSecond),
		}),
	);
	check(
		"scheduled posts still follow",
		slugFollowsTitle({
			title: "Same Title",
			slug: second.slug,
			status: "scheduled",
			takenSlugs: new Set(takenForSecond),
		}),
	);
	check(
		"blank titles fall back to untitled",
		slugForTitle("   ", new Set()) === "untitled",
	);

	log(`\nE2E complete. All green.`);
	mkdirSync(dirname(ARTIFACT), { recursive: true });
	writeFileSync(ARTIFACT, `${lines.join("\n")}\n`);
	log(`Artifact: docs/e2e/auto-slug.log`);
}

if (import.meta.main) {
	main().catch((error: unknown) => {
		console.error(error instanceof Error ? error.message : error);
		process.exit(1);
	});
}
