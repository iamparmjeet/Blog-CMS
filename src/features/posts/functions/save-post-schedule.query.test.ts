import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "#/db";
import { posts, settings } from "#/db/schema";
import { savePostSchedule } from "./save-post-schedule.query";

const OWNER = "owner-1";
const OTHER = "someone-else";
const NOW = new Date("2026-09-22T00:00:00.000Z");

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

async function insertPost(
	db: Db,
	overrides: {
		userId?: string;
		status?: "draft" | "published" | "scheduled" | "archived";
		title?: string;
		slug?: string;
	} = {},
): Promise<number> {
	const [post] = await db
		.insert(posts)
		.values({
			userId: OWNER,
			status: "draft",
			title: "Schedulable post",
			slug: "schedulable-post",
			seoTitle: "",
			description: "",
			createdAt: new Date("2026-01-01T00:00:00.000Z"),
			updatedAt: new Date("2026-01-01T00:00:00.000Z"),
			...overrides,
		})
		.returning({ id: posts.id });

	if (!post) {
		throw new Error("Could not seed post");
	}

	return post.id;
}

async function readSchedule(db: Db, postId: number) {
	return db
		.select({ status: posts.status, scheduledAt: posts.scheduledAt })
		.from(posts)
		.where(eq(posts.id, postId))
		.get();
}

let db: Db;

beforeEach(async () => {
	db = createThrowawayDb();
	await db.insert(settings).values({ userId: OWNER, timeZone: "Asia/Kolkata" });
});

describe("savePostSchedule", () => {
	it("schedules a draft at the timezone-correct instant", async () => {
		const postId = await insertPost(db);

		const result = await savePostSchedule(db, {
			userId: OWNER,
			postId,
			dateTimeLocal: "2026-09-23T10:00",
			now: NOW,
		});

		expect(result).toEqual({
			postId,
			status: "scheduled",
			scheduledAt: "2026-09-23T04:30:00.000Z",
		});
		expect(await readSchedule(db, postId)).toEqual({
			status: "scheduled",
			scheduledAt: new Date("2026-09-23T04:30:00.000Z"),
		});
	});

	it("uses the app default zone when no settings row exists", async () => {
		await db.delete(settings);
		const postId = await insertPost(db);

		const result = await savePostSchedule(db, {
			userId: OWNER,
			postId,
			dateTimeLocal: "2026-09-23T10:00",
			now: NOW,
		});

		expect(result.scheduledAt).toBe("2026-09-23T04:30:00.000Z");
		expect(await readSchedule(db, postId)).toEqual({
			status: "scheduled",
			scheduledAt: new Date("2026-09-23T04:30:00.000Z"),
		});
	});

	it("rejects a past instant and leaves the draft alone", async () => {
		const postId = await insertPost(db);

		await expect(
			savePostSchedule(db, {
				userId: OWNER,
				postId,
				dateTimeLocal: "2026-09-21T10:00",
				now: NOW,
			}),
		).rejects.toThrow("must be in the future");
		expect(await readSchedule(db, postId)).toEqual({
			status: "draft",
			scheduledAt: null,
		});
	});

	it("rejects malformed input without writing", async () => {
		const postId = await insertPost(db);

		await expect(
			savePostSchedule(db, {
				userId: OWNER,
				postId,
				dateTimeLocal: "whenever",
				now: NOW,
			}),
		).rejects.toThrow();
		expect(await readSchedule(db, postId)).toEqual({
			status: "draft",
			scheduledAt: null,
		});
	});

	it("rejects scheduling when metadata is invalid", async () => {
		const postId = await insertPost(db, { slug: "Bad Slug" });

		await expect(
			savePostSchedule(db, {
				userId: OWNER,
				postId,
				dateTimeLocal: "2026-09-23T10:00",
				now: NOW,
			}),
		).rejects.toThrow("Post metadata must be valid before scheduling");
		expect(await readSchedule(db, postId)).toEqual({
			status: "draft",
			scheduledAt: null,
		});
	});

	it("rejects another owner's post", async () => {
		const postId = await insertPost(db, { userId: OTHER });

		await expect(
			savePostSchedule(db, {
				userId: OWNER,
				postId,
				dateTimeLocal: "2026-09-23T10:00",
				now: NOW,
			}),
		).rejects.toThrow("Post not found");
	});

	it("rejects scheduling an already-published post", async () => {
		const postId = await insertPost(db, { status: "published" });

		await expect(
			savePostSchedule(db, {
				userId: OWNER,
				postId,
				dateTimeLocal: "2026-09-23T10:00",
				now: NOW,
			}),
		).rejects.toThrow("Cannot schedule");
	});

	it("unschedules back to draft and clears the instant", async () => {
		const postId = await insertPost(db);
		await savePostSchedule(db, {
			userId: OWNER,
			postId,
			dateTimeLocal: "2026-09-23T10:00",
			now: NOW,
		});

		const result = await savePostSchedule(db, {
			userId: OWNER,
			postId,
			dateTimeLocal: null,
			now: NOW,
		});

		expect(result).toEqual({ postId, status: "draft", scheduledAt: null });
		expect(await readSchedule(db, postId)).toEqual({
			status: "draft",
			scheduledAt: null,
		});
	});

	it("rejects unscheduling a post that was never scheduled", async () => {
		const postId = await insertPost(db);

		await expect(
			savePostSchedule(db, {
				userId: OWNER,
				postId,
				dateTimeLocal: null,
				now: NOW,
			}),
		).rejects.toThrow("is not scheduled");
	});
});
