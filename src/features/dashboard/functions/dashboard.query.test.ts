import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "#/db";
import { posts } from "#/db/schema";
import { selectDashboardPostRowsByOwner } from "./dashboard.query";

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
	{
		userId = OWNER,
		status = "draft",
		title = "Dashboard post",
		slug,
		deletedAt,
		updatedAt = new Date("2026-07-15T00:00:00.000Z"),
		wordCount = 100,
	}: {
		userId?: string;
		status?: "draft" | "published" | "scheduled" | "archived";
		title?: string;
		slug?: string;
		deletedAt?: Date;
		updatedAt?: Date;
		wordCount?: number;
	} = {},
) {
	const [post] = await db
		.insert(posts)
		.values({
			userId,
			status,
			title,
			slug: slug ?? title.toLowerCase().replace(/\s+/g, "-"),
			wordCount,
			deletedAt,
			updatedAt,
			createdAt: new Date("2026-01-01T00:00:00.000Z"),
		})
		.returning({ id: posts.id });

	if (!post) {
		throw new Error("Could not seed post");
	}

	return post.id;
}

describe("selectDashboardPostRowsByOwner", () => {
	let db: Db;

	beforeEach(() => {
		db = createThrowawayDb();
	});

	it("returns only the owner's non-deleted posts, newest first", async () => {
		const archivedId = await insertPost(db, {
			status: "archived",
			title: "Archived note",
			updatedAt: new Date("2026-07-10T00:00:00.000Z"),
		});
		const scheduledId = await insertPost(db, {
			status: "scheduled",
			title: "Scheduled essay",
			updatedAt: new Date("2026-07-12T00:00:00.000Z"),
		});
		const publishedId = await insertPost(db, {
			status: "published",
			title: "Live post",
			updatedAt: new Date("2026-07-14T00:00:00.000Z"),
		});
		const draftId = await insertPost(db, {
			status: "draft",
			title: "WIP draft",
			updatedAt: new Date("2026-07-16T00:00:00.000Z"),
		});
		await insertPost(db, {
			title: "Trashed",
			slug: "trashed",
			deletedAt: new Date("2026-07-20T00:00:00.000Z"),
			updatedAt: new Date("2026-07-18T00:00:00.000Z"),
		});
		await insertPost(db, {
			userId: OTHER_OWNER,
			title: "Foreign draft",
			slug: "foreign-draft",
			updatedAt: new Date("2026-07-22T00:00:00.000Z"),
		});

		const rows = await selectDashboardPostRowsByOwner(db, OWNER);

		expect(rows.map((row) => row.id)).toEqual([
			draftId,
			publishedId,
			scheduledId,
			archivedId,
		]);
		expect(rows.map((row) => row.status)).toEqual([
			"draft",
			"published",
			"scheduled",
			"archived",
		]);
		expect(rows.every((row) => row.wordCount >= 0)).toBe(true);
	});

	it("returns an empty list when the owner has only deleted posts", async () => {
		await insertPost(db, {
			title: "Only trash",
			slug: "only-trash",
			deletedAt: new Date("2026-07-20T00:00:00.000Z"),
		});

		expect(await selectDashboardPostRowsByOwner(db, OWNER)).toEqual([]);
	});
});
