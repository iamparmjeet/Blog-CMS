import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "#/db";
import { user } from "#/db/auth-schema";
import { posts, settings } from "#/db/schema";
import {
	selectFeedSettings,
	selectInstanceOwnerId,
	selectPublishedFeedPostBySlug,
	selectPublishedFeedPosts,
} from "./feed.query";

const OWNER = "owner-1";
const OTHER = "someone-else";

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

async function seedOwner(db: Db) {
	await db.insert(user).values({
		id: OWNER,
		name: "Owner",
		email: "owner@example.com",
		createdAt: new Date("2026-01-01T00:00:00.000Z"),
	});
}

async function seedPost(
	db: Db,
	overrides: Partial<typeof posts.$inferInsert> & { slug: string },
) {
	await db.insert(posts).values({
		userId: OWNER,
		title: overrides.slug,
		status: "published",
		publishedAt: new Date("2026-09-01T00:00:00.000Z"),
		...overrides,
	});
}

describe("feed queries (throwaway DB)", () => {
	let db: Db;

	beforeEach(() => {
		db = createThrowawayDb();
	});

	it("resolves the instance owner as the single claimed user", async () => {
		expect(await selectInstanceOwnerId(db)).toBeNull();

		await seedOwner(db);

		expect(await selectInstanceOwnerId(db)).toBe(OWNER);
	});

	it("returns only published, non-deleted owner posts newest first", async () => {
		await seedOwner(db);
		await seedPost(db, {
			slug: "older",
			publishedAt: new Date("2026-08-01T00:00:00.000Z"),
		});
		await seedPost(db, {
			slug: "newer",
			publishedAt: new Date("2026-09-10T00:00:00.000Z"),
		});
		await seedPost(db, { slug: "draft-one", status: "draft" });
		await seedPost(db, { slug: "scheduled-one", status: "scheduled" });
		await seedPost(db, { slug: "archived-one", status: "archived" });
		await seedPost(db, {
			slug: "trashed",
			deletedAt: new Date("2026-09-12T00:00:00.000Z"),
		});
		await seedPost(db, {
			slug: "foreign",
			userId: OTHER,
		});

		const rows = await selectPublishedFeedPosts(db, OWNER);

		expect(rows.map((row) => row.slug)).toEqual(["newer", "older"]);
	});

	it("finds a single published post by slug and ignores drafts", async () => {
		await seedOwner(db);
		await seedPost(db, { slug: "live" });
		await seedPost(db, { slug: "hidden", status: "draft" });

		const live = await selectPublishedFeedPostBySlug(db, OWNER, "live");
		const hidden = await selectPublishedFeedPostBySlug(db, OWNER, "hidden");
		const missing = await selectPublishedFeedPostBySlug(db, OWNER, "nope");

		expect(live?.slug).toBe("live");
		expect(hidden).toBeUndefined();
		expect(missing).toBeUndefined();
	});

	it("reads the owner's feed settings allowlist", async () => {
		await seedOwner(db);
		expect(await selectFeedSettings(db, OWNER)).toBeNull();

		await db.insert(settings).values({
			userId: OWNER,
			allowedOrigins: "https://site-a.example,https://site-b.example",
			blogTitle: "My Blog",
			domain: "blog.example",
		});

		const feedSettings = await selectFeedSettings(db, OWNER);

		expect(feedSettings).toEqual({
			allowedOrigins: "https://site-a.example,https://site-b.example",
			blogTitle: "My Blog",
			domain: "blog.example",
			bio: null,
		});

		await db
			.update(settings)
			.set({ allowedOrigins: null })
			.where(eq(settings.userId, OWNER));

		expect((await selectFeedSettings(db, OWNER))?.allowedOrigins).toBe("");
	});
});
