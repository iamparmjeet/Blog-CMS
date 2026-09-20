import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "#/db";
import { posts } from "#/db/schema";
import {
	insertPostDraft,
	selectPostEditorRowByOwner,
	selectPostRowsByOwner,
} from "./posts.query";

const OWNER = "owner-1";
const OTHER_OWNER = "someone-else";

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

describe("selectPostRowsByOwner", () => {
	let db: Db;

	beforeEach(() => {
		db = createThrowawayDb();
	});

	it("returns only the owner's visible posts, newest first", async () => {
		await db.insert(posts).values([
			{
				userId: OWNER,
				title: "Older",
				slug: "older",
				updatedAt: new Date("2026-07-01T00:00:00.000Z"),
			},
			{
				userId: OWNER,
				title: "Newer",
				slug: "newer",
				updatedAt: new Date("2026-07-10T00:00:00.000Z"),
			},
			{
				userId: OWNER,
				title: "Deleted",
				slug: "deleted",
				updatedAt: new Date("2026-07-20T00:00:00.000Z"),
				deletedAt: new Date("2026-07-20T00:00:00.000Z"),
			},
			{
				userId: OTHER_OWNER,
				title: "Foreign",
				slug: "foreign",
				updatedAt: new Date("2026-07-30T00:00:00.000Z"),
			},
		]);

		const rows = await selectPostRowsByOwner(db, OWNER);

		expect(rows.map((row) => row.slug)).toEqual(["newer", "older"]);
	});
});

describe("selectPostEditorRowByOwner", () => {
	let db: Db;

	beforeEach(() => {
		db = createThrowawayDb();
	});

	it("returns the owner's visible editor data and hides other posts", async () => {
		const [ownerPost] = await db
			.insert(posts)
			.values({
				userId: OWNER,
				title: "Editor post",
				slug: "editor-post",
				body: '{"type":"doc","content":[]}',
				wordCount: 0,
			})
			.returning({ id: posts.id });
		const [foreignPost] = await db
			.insert(posts)
			.values({
				userId: OTHER_OWNER,
				title: "Foreign post",
				slug: "foreign-post",
			})
			.returning({ id: posts.id });

		if (!ownerPost || !foreignPost) {
			throw new Error("Could not seed editor posts");
		}

		const editorPost = await selectPostEditorRowByOwner(
			db,
			OWNER,
			ownerPost.id,
		);
		const foreignEditorPost = await selectPostEditorRowByOwner(
			db,
			OWNER,
			foreignPost.id,
		);

		expect(editorPost).toMatchObject({
			id: ownerPost.id,
			title: "Editor post",
			slug: "editor-post",
			seoTitle: "",
			description: "",
			body: '{"type":"doc","content":[]}',
		});
		expect(foreignEditorPost).toBeUndefined();
	});
});

describe("insertPostDraft", () => {
	let db: Db;

	beforeEach(() => {
		db = createThrowawayDb();
	});

	it("creates an untitled draft by default", async () => {
		const created = await insertPostDraft(db, { userId: OWNER });

		expect(created.title).toBe("Untitled");
		expect(created.slug).toBe("untitled");
		expect(created.id).toBeGreaterThan(0);

		const rows = await selectPostRowsByOwner(db, OWNER);

		expect(rows).toHaveLength(1);
		expect(rows[0]?.status).toBe("draft");
		expect(rows[0]?.wordCount).toBe(0);

		const [post] = await db
			.select({ description: posts.description })
			.from(posts)
			.where(eq(posts.id, created.id));

		expect(post?.description).toBe("");
	});

	it("slugifies the title", async () => {
		const created = await insertPostDraft(db, {
			userId: OWNER,
			title: "Why I Ditched Notion",
		});

		expect(created.title).toBe("Why I Ditched Notion");
		expect(created.slug).toBe("why-i-ditched-notion");
	});

	it("de-duplicates slugs within the owner", async () => {
		const first = await insertPostDraft(db, {
			userId: OWNER,
			title: "Same title",
		});
		const second = await insertPostDraft(db, {
			userId: OWNER,
			title: "Same title",
		});

		expect(first.slug).toBe("same-title");
		expect(second.slug).toBe("same-title-2");
	});

	it("lets different owners share a slug", async () => {
		const first = await insertPostDraft(db, { userId: OWNER, title: "Shared" });
		const second = await insertPostDraft(db, {
			userId: OTHER_OWNER,
			title: "Shared",
		});

		expect(first.slug).toBe("shared");
		expect(second.slug).toBe("shared");
	});

	it("enforces slugs as unique per owner", async () => {
		await db.insert(posts).values({
			userId: OWNER,
			title: "First",
			slug: "shared",
		});

		await expect(
			db.insert(posts).values({
				userId: OWNER,
				title: "Duplicate",
				slug: "shared",
			}),
		).rejects.toThrow(/unique/i);

		await db.insert(posts).values({
			userId: OTHER_OWNER,
			title: "Other owner",
			slug: "shared",
		});
	});

	it("rejects statuses outside the lifecycle", async () => {
		await expect(
			db.insert(posts).values({
				userId: OWNER,
				title: "Invalid",
				slug: "invalid",
				status: "deleted",
			}),
		).rejects.toThrow(/check/i);
	});
});
