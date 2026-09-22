import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "#/db";
import { media, posts, settings, writingActivity } from "#/db/schema";
import { collectBackupData, handleExportRequest } from "./backup-export.server";

const OWNER = "owner-1";
const OTHER = "someone-else";

function createThrowawayDb(): Db {
	const sqlite = new Database(":memory:");

	sqlite.exec(`
		CREATE TABLE settings (
			user_id TEXT PRIMARY KEY NOT NULL,
			display_name TEXT,
			blog_title TEXT,
			domain TEXT,
			bio TEXT,
			accent_color TEXT DEFAULT '#7c3aed' NOT NULL,
			theme_mode TEXT DEFAULT 'night' NOT NULL,
			surface_tint TEXT,
			default_model TEXT DEFAULT 'z-ai/glm-5.3-flash' NOT NULL,
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
			updated_at INTEGER DEFAULT 0 NOT NULL
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
			created_at integer DEFAULT 0 NOT NULL,
			updated_at integer DEFAULT 0 NOT NULL
		);
		CREATE TABLE media (
			id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
			user_id text NOT NULL,
			post_id integer,
			name text NOT NULL,
			type text NOT NULL,
			size text NOT NULL,
			dims text DEFAULT '' NOT NULL,
			duration text,
			file_key text,
			url text NOT NULL,
			preview_key text,
			preview_url text,
			preview_type text,
			preview_size text,
			status text DEFAULT 'pending' NOT NULL,
			deleted_at integer,
			created_at integer DEFAULT 0 NOT NULL
		);
		CREATE TABLE writing_activity (
			user_id text NOT NULL,
			activity_date text NOT NULL,
			words_added integer DEFAULT 0 NOT NULL,
			updated_at integer DEFAULT 0 NOT NULL,
			PRIMARY KEY (user_id, activity_date)
		);
	`);

	return drizzle(sqlite) as unknown as Db;
}

let db: Db;

beforeEach(async () => {
	db = createThrowawayDb();
	await db.insert(settings).values({ userId: OWNER, blogTitle: "ContentOS" });
	await db.insert(posts).values({
		userId: OWNER,
		title: "Mine",
		slug: "mine",
		seoTitle: "",
		status: "published",
		body: null,
		description: "",
		createdAt: new Date("2026-09-19T00:00:00.000Z"),
		updatedAt: new Date("2026-09-20T00:00:00.000Z"),
	});
	await db.insert(posts).values({
		userId: OTHER,
		title: "Theirs",
		slug: "theirs",
		seoTitle: "",
		status: "published",
		body: null,
		description: "",
		createdAt: new Date("2026-09-19T00:00:00.000Z"),
		updatedAt: new Date("2026-09-20T00:00:00.000Z"),
	});
	await db.insert(media).values({
		userId: OWNER,
		name: "photo.png",
		type: "image/png",
		size: "4",
		dims: "",
		fileKey: "media/owner/1-photo.png",
		url: "https://cdn.example/1-photo.png",
		status: "ready",
		createdAt: new Date("2026-09-19T00:00:00.000Z"),
	});
	await db.insert(writingActivity).values({
		userId: OWNER,
		activityDate: "2026-09-22",
		wordsAdded: 120,
	});
});

const stubReadObject = async (key: string) => {
	if (key === "media/owner/1-photo.png") {
		return {
			contentType: "image/png",
			bytes: new Uint8Array([1, 2, 3, 4]),
		};
	}
	return null;
};

describe("collectBackupData", () => {
	it("scopes every table to the owner", async () => {
		const data = await collectBackupData(db, OWNER);

		expect(data.posts.map((post) => post.slug)).toEqual(["mine"]);
		expect(data.media.map((entry) => entry.row.name)).toEqual(["photo.png"]);
		expect(data.activity).toEqual([
			{ activityDate: "2026-09-22", wordsAdded: 120 },
		]);
		expect(data.settings).toMatchObject({ blogTitle: "ContentOS" });
		expect(data.settings).not.toHaveProperty("userId");
	});

	it("returns null settings when no row exists", async () => {
		const data = await collectBackupData(db, OTHER);

		expect(data.posts.map((post) => post.slug)).toEqual(["theirs"]);
		expect(data.settings).toBeNull();
		expect(data.media).toEqual([]);
		expect(data.activity).toEqual([]);
	});
});

describe("handleExportRequest", () => {
	it("returns a downloadable versioned bundle with file bytes", async () => {
		const response = await handleExportRequest({
			db,
			userId: OWNER,
			readObject: stubReadObject,
			now: new Date("2026-09-23T00:00:00.000Z"),
		});

		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toContain("application/json");
		expect(response.headers.get("content-disposition")).toContain("attachment");

		const bundle = (await response.json()) as {
			version: number;
			posts: Array<{ slug: string }>;
			media: Array<{
				original: { contentBase64?: string; missing?: boolean };
			}>;
		};

		expect(bundle.version).toBe(1);
		expect(bundle.posts.map((post) => post.slug)).toEqual(["mine"]);
		const encoded = bundle.media[0]?.original.contentBase64 ?? "";
		expect(Buffer.from(encoded, "base64")).toEqual(Buffer.from([1, 2, 3, 4]));
	});

	it("marks missing objects instead of failing", async () => {
		const response = await handleExportRequest({
			db,
			userId: OWNER,
			readObject: async () => null,
			now: new Date("2026-09-23T00:00:00.000Z"),
		});

		const bundle = (await response.json()) as {
			media: Array<{ original: { missing?: boolean } }>;
		};

		expect(response.status).toBe(200);
		expect(bundle.media[0]?.original).toEqual({ missing: true });
	});
});
