import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "#/db";
import { user } from "#/db/auth-schema";
import { posts, settings } from "#/db/schema";
import { buildRssXml, handleRssFeed } from "./rss.server";

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
	await db.insert(settings).values({
		userId: OWNER,
		blogTitle: "Parm <Writes>",
		bio: "Essays & notes",
	});
	await db.insert(posts).values({
		userId: OWNER,
		title: "Hello <world>",
		slug: "hello",
		status: "published",
		seoTitle: "",
		description: "A greeting & farewell",
		publishedAt: new Date("2026-09-01T00:00:00.000Z"),
		createdAt: new Date("2026-01-01T00:00:00.000Z"),
		updatedAt: new Date("2026-09-02T00:00:00.000Z"),
	});
});

describe("buildRssXml", () => {
	it("escapes markup in titles and descriptions", () => {
		const xml = buildRssXml({
			siteTitle: "Parm <Writes>",
			siteUrl: "https://blog.example",
			siteDescription: "Essays & notes",
			items: [
				{
					title: "Hello <world>",
					link: "https://blog.example/posts/hello",
					description: "A greeting & farewell",
					publishedAt: new Date("2026-09-01T00:00:00.000Z"),
				},
			],
		});

		expect(xml).toContain("<title>Parm &lt;Writes&gt;</title>");
		expect(xml).toContain("<title>Hello &lt;world&gt;</title>");
		expect(xml).toContain("A greeting &amp; farewell");
		expect(xml).toContain("Essays &amp; notes");
		expect(xml).not.toContain("<world>");
	});

	it("renders an empty channel without items", () => {
		const xml = buildRssXml({
			siteTitle: "Empty",
			siteUrl: "https://blog.example",
			siteDescription: "",
			items: [],
		});

		expect(xml).toContain("<channel>");
		expect(xml).not.toContain("<item>");
	});
});

describe("handleRssFeed", () => {
	it("serves the published posts as RSS when enabled", async () => {
		const response = await handleRssFeed(
			new Request("https://cms.example/feed.xml"),
			db,
		);

		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toContain(
			"application/rss+xml",
		);

		const xml = await response.text();
		expect(xml).toContain("Hello &lt;world&gt;");
		expect(xml).toContain("https://cms.example/posts/hello");
	});

	it("returns 404 when the RSS toggle is off", async () => {
		await db
			.update(settings)
			.set({ rssFeed: false })
			.where(eq(settings.userId, OWNER));

		const response = await handleRssFeed(
			new Request("https://cms.example/feed.xml"),
			db,
		);

		expect(response.status).toBe(404);
	});
});
