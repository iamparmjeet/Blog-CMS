import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "#/db";
import { user } from "#/db/auth-schema";
import { handleFeedCollection } from "./feed.server";

const OWNER = "owner-1";

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
		CREATE TABLE rate_limits (
			key TEXT PRIMARY KEY NOT NULL,
			window_start INTEGER NOT NULL,
			count INTEGER NOT NULL
		);
	`);

	return drizzle(sqlite) as unknown as Db;
}

let db: Db;

beforeEach(async () => {
	db = createThrowawayDb();
	await db.insert(user).values({
		id: OWNER,
		name: "Owner",
		email: "owner@example.com",
		createdAt: new Date("2026-01-01T00:00:00.000Z"),
	});
});

function collectionRequest(ip: string): Request {
	return new Request("https://cms.example/api/posts", {
		headers: { "cf-connecting-ip": ip },
	});
}

describe("handleFeedCollection rate limiting", () => {
	it("serves requests under the limit", async () => {
		const response = await handleFeedCollection(
			collectionRequest("1.2.3.4"),
			db,
		);

		expect(response.status).toBe(200);
	});

	it("answers 429 past the limit without leaking posts", async () => {
		for (let attempt = 0; attempt < 100; attempt += 1) {
			await handleFeedCollection(collectionRequest("9.9.9.9"), db);
		}

		const blocked = await handleFeedCollection(
			collectionRequest("9.9.9.9"),
			db,
		);

		expect(blocked.status).toBe(429);
		expect(blocked.headers.get("retry-after")).not.toBeNull();

		const payload = (await blocked.json()) as { posts?: unknown };
		expect(payload.posts).toBeUndefined();
	});

	it("limits identities independently", async () => {
		for (let attempt = 0; attempt < 100; attempt += 1) {
			await handleFeedCollection(collectionRequest("9.9.9.9"), db);
		}

		const other = await handleFeedCollection(collectionRequest("1.2.3.4"), db);

		expect(other.status).toBe(200);
	});
});
