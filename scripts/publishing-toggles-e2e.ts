/**
 * T4.1 closeout deterministic E2E: publishing toggles persist, gate the
 * public JSON feed, and drive the RSS endpoint through the real query and
 * handler layers (throwaway DB stands in for D1).
 *
 * Covers the validation failure (non-boolean toggle rejected) plus the
 * disabled-RSS edge (404 with no content).
 *
 * Run (Node — Bun cannot load better-sqlite3):
 *   ./node_modules/.bin/tsx scripts/publishing-toggles-e2e.ts
 * Artifact: docs/e2e/t4.1-publishing-toggles.log
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import type { Db } from "#/db";
import { user } from "#/db/auth-schema";
import { posts } from "#/db/schema";
import {
	selectFeedSettings,
	selectPublishedFeedPosts,
} from "#/features/feed/feed.query";
import { toFeedPost } from "#/features/feed/feed.utils";
import { handleRssFeed } from "#/features/feed/rss.server";
import {
	publishingInputSchema,
	readOwnerProfile,
	upsertPublishing,
} from "#/features/settings/functions/settings.query";

const OWNER = "e2e-owner";
const ARTIFACT = resolve(
	dirname(new URL(import.meta.url).pathname),
	"../docs/e2e/t4.1-publishing-toggles.log",
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
		CREATE TABLE user (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			email TEXT NOT NULL UNIQUE,
			owner_claim INTEGER NOT NULL DEFAULT 1 UNIQUE,
			email_verified INTEGER DEFAULT 0 NOT NULL,
			image TEXT,
			created_at INTEGER DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
			updated_at INTEGER DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
		);
		CREATE TABLE settings (
			user_id TEXT PRIMARY KEY NOT NULL,
			display_name TEXT,
			blog_title TEXT,
			domain TEXT,
			bio TEXT,
			accent_color TEXT DEFAULT '#7c3aed' NOT NULL,
			theme_mode TEXT DEFAULT 'night' NOT NULL,
			surface_tint TEXT,
			default_model TEXT DEFAULT 'google/gemini-2.5-flash' NOT NULL,
			seo_meta INTEGER DEFAULT 1 NOT NULL,
			rss_feed INTEGER DEFAULT 1 NOT NULL,
			time_zone TEXT DEFAULT 'Asia/Kolkata' NOT NULL,
			reading_time INTEGER DEFAULT 0 NOT NULL,
			allowed_origins TEXT,
			umami_share_url TEXT,
			bucket_name TEXT,
			public_url TEXT,
			account_id TEXT,
			writing_style TEXT,
			writing_sample TEXT,
			updated_at INTEGER DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
		);
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
	await db.insert(user).values({
		id: OWNER,
		name: "E2E Owner",
		email: "e2e@example.com",
		createdAt: new Date("2026-01-01T00:00:00.000Z"),
	});
	await db.insert(posts).values({
		userId: OWNER,
		title: "Long read",
		slug: "long-read",
		status: "published",
		seoTitle: "Long read SEO",
		description: "A very long essay",
		publishedAt: new Date("2026-09-01T00:00:00.000Z"),
		wordCount: 450,
		createdAt: new Date("2026-01-01T00:00:00.000Z"),
		updatedAt: new Date("2026-09-02T00:00:00.000Z"),
	});

	// Scenario 1 — toggles validate and persist through the real query layer.
	const validated = publishingInputSchema.parse({
		timeZone: "Asia/Kolkata",
		umamiShareUrl: "",
		seoMeta: false,
		rssFeed: true,
		readingTime: true,
	});
	await upsertPublishing(db, OWNER, validated);
	const profile = await readOwnerProfile(db, OWNER);
	check("toggles persist and read back", profile.seoMeta === false && profile.rssFeed === true && profile.readingTime === true);
	check("other publishing fields untouched", profile.timeZone === "Asia/Kolkata");

	// Scenario 2 — the JSON feed honors the persisted toggles.
	const snapshot = await selectFeedSettings(db, OWNER);
	const [row] = await selectPublishedFeedPosts(db, OWNER);
	const post = toFeedPost(row!, {
		domain: snapshot?.domain,
		requestUrl: "https://cms.example/api/posts",
		seoMeta: snapshot?.seoMeta,
		readingTime: snapshot?.readingTime,
	});
	check("seoMeta off empties seo fields", post.seoTitle === "" && post.description === "");
	check("readingTime on reports minutes", post.readingTimeMinutes === 3, String(post.readingTimeMinutes));

	// Scenario 3 — RSS serves published posts while enabled.
	const rss = await handleRssFeed(new Request("https://cms.example/rss"), db);
	check("rss enabled serves xml", rss.status === 200 && (rss.headers.get("content-type") ?? "").includes("application/rss+xml"));
	const xml = await rss.text();
	check("rss item links the public post", xml.includes("https://cms.example/posts/long-read"));

	// Scenario 4 (edge) — disabled RSS answers 404 with no content.
	await upsertPublishing(db, OWNER, { ...validated, rssFeed: false });
	const disabled = await handleRssFeed(new Request("https://cms.example/rss"), db);
	check("rss disabled returns 404", disabled.status === 404);
	check("rss disabled exposes no content", (await disabled.text()).length < 32);

	// Scenario 5 (failure) — non-boolean toggles never reach the database.
	const invalid = publishingInputSchema.safeParse({
		timeZone: "UTC",
		umamiShareUrl: "",
		seoMeta: "yes",
		rssFeed: true,
		readingTime: false,
	});
	check("non-boolean toggle rejected", !invalid.success);

	log(`\nE2E complete. All green.`);
	mkdirSync(dirname(ARTIFACT), { recursive: true });
	writeFileSync(ARTIFACT, `${lines.join("\n")}\n`);
	log(`Artifact: docs/e2e/t4.1-publishing-toggles.log`);
}

if (import.meta.main) {
	main().catch((error: unknown) => {
		console.error(error instanceof Error ? error.message : error);
		process.exit(1);
	});
}
