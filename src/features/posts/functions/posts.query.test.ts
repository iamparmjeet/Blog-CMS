import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "#/db";
import { posts } from "#/db/schema";
import { insertPostDraft, selectPostRowsByOwner } from "./posts.query";

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
			status text DEFAULT 'draft' NOT NULL,
			body text,
			wordCount integer DEFAULT 0 NOT NULL,
			revision integer DEFAULT 0 NOT NULL,
			deleted_at integer,
			created_at integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
			updated_at integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
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
});
