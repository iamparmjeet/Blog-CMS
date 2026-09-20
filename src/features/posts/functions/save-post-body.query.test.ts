import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "#/db";
import { posts, writingActivity } from "#/db/schema";
import { serializePostBody } from "./post-body";
import { updatePostBody } from "./save-post-body.query";

const OWNER = "owner-1";
const OTHER_OWNER = "owner-2";

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
			created_at integer NOT NULL,
			updated_at integer NOT NULL
		);
		CREATE TABLE settings (
			user_id text PRIMARY KEY NOT NULL,
			time_zone text NOT NULL DEFAULT 'UTC'
		);
		CREATE TABLE writing_activity (
			user_id text NOT NULL,
			activity_date text NOT NULL,
			words_added integer NOT NULL DEFAULT 0,
			updated_at integer NOT NULL,
			PRIMARY KEY (user_id, activity_date)
		);
	`);
	sqlite
		.prepare("INSERT INTO settings (user_id, time_zone) VALUES (?, ?)")
		.run(OWNER, "Asia/Kolkata");

	const db = drizzle(sqlite) as unknown as Db;

	Object.assign(db, {
		batch: async (queries: readonly PromiseLike<unknown>[]) =>
			Promise.all(queries),
	});

	return db;
}

function documentWithText(text: string) {
	return JSON.stringify({
		type: "doc",
		content: [
			{
				type: "paragraph",
				content: text ? [{ type: "text", text }] : [],
			},
		],
	});
}

async function insertPost(db: Db, userId = OWNER) {
	const [post] = await db
		.insert(posts)
		.values({
			userId,
			title: "Draft",
			slug: `draft-${userId}`,
			updatedAt: new Date("2026-01-01T00:00:00.000Z"),
		})
		.returning({ id: posts.id });

	if (!post) {
		throw new Error("Could not seed post");
	}

	return post.id;
}

describe("updatePostBody", () => {
	let db: Db;

	beforeEach(() => {
		db = createThrowawayDb();
	});

	it("stores canonical JSON and records positive activity in the owner's timezone", async () => {
		const postId = await insertPost(db);
		await db.insert(writingActivity).values({
			userId: OWNER,
			activityDate: "2026-01-02",
			wordsAdded: 0,
			updatedAt: new Date("2026-01-01T00:00:00.000Z"),
		});
		const body = documentWithText("one two three four five");

		const result = await updatePostBody(db, {
			userId: OWNER,
			postId,
			body,
			now: new Date("2026-01-01T20:00:00.000Z"),
		});

		expect(result).toMatchObject({
			postId,
			wordCount: 5,
			wordsAdded: 5,
			activityDate: "2026-01-02",
		});

		const [post] = await db
			.select({ body: posts.body, wordCount: posts.wordCount })
			.from(posts)
			.where(eq(posts.id, postId));
		expect(post).toEqual({
			body: serializePostBody(JSON.parse(body)),
			wordCount: 5,
		});

		const [activity] = await db.select().from(writingActivity);
		expect(activity?.wordsAdded).toBe(5);
	});

	it("does not subtract previously recorded activity when words are removed", async () => {
		const postId = await insertPost(db);
		const now = new Date("2026-01-01T00:00:00.000Z");

		await updatePostBody(db, {
			userId: OWNER,
			postId,
			body: documentWithText("one two three four"),
			now,
		});
		const result = await updatePostBody(db, {
			userId: OWNER,
			postId,
			body: documentWithText("one two"),
			now,
		});

		expect(result.wordsAdded).toBe(0);
		const [activity] = await db.select().from(writingActivity);
		expect(activity?.wordsAdded).toBe(4);
	});

	it("does not modify a post owned by someone else", async () => {
		const postId = await insertPost(db, OTHER_OWNER);

		await expect(
			updatePostBody(db, {
				userId: OWNER,
				postId,
				body: documentWithText("private content"),
			}),
		).rejects.toThrow("Post not found");
	});
});
