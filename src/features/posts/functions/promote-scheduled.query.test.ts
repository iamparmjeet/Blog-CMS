import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "#/db";
import { posts } from "#/db/schema";
import { promoteDueScheduledPosts } from "./promote-scheduled.query";

const OWNER = "owner-1";
const DUE = new Date("2026-09-22T00:00:00.000Z");
const BEFORE = new Date("2026-09-21T23:00:00.000Z");
const AFTER = new Date("2026-09-22T01:00:00.000Z");

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
	overrides: {
		status?: "draft" | "published" | "scheduled" | "archived";
		slug?: string;
		scheduledAt?: Date | null;
		deletedAt?: Date;
	} = {},
): Promise<number> {
	const [post] = await db
		.insert(posts)
		.values({
			userId: OWNER,
			status: "draft",
			title: overrides.slug ?? "post",
			slug: "post",
			seoTitle: "",
			description: "",
			scheduledAt: null,
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

let db: Db;
let dueId: number;
let futureId: number;
let deletedId: number;
let draftId: number;
let archivedId: number;

beforeEach(async () => {
	db = createThrowawayDb();
	dueId = await insertPost(db, {
		status: "scheduled",
		slug: "due",
		scheduledAt: DUE,
	});
	futureId = await insertPost(db, {
		status: "scheduled",
		slug: "future",
		scheduledAt: new Date("2026-09-23T00:00:00.000Z"),
	});
	deletedId = await insertPost(db, {
		status: "scheduled",
		slug: "deleted",
		scheduledAt: DUE,
		deletedAt: new Date("2026-09-21T00:00:00.000Z"),
	});
	draftId = await insertPost(db, { slug: "draft" });
	archivedId = await insertPost(db, { status: "archived", slug: "archived" });
});

async function readPost(postId: number) {
	return db
		.select({
			status: posts.status,
			publishedAt: posts.publishedAt,
			scheduledAt: posts.scheduledAt,
		})
		.from(posts)
		.where(eq(posts.id, postId))
		.get();
}

describe("promoteDueScheduledPosts", () => {
	it("publishes the due post exactly once with a stable publishedAt", async () => {
		const first = await promoteDueScheduledPosts(db, DUE);

		expect(first).toEqual({ postIds: [dueId] });
		expect(await readPost(dueId)).toEqual({
			status: "published",
			publishedAt: DUE,
			scheduledAt: null,
		});

		const second = await promoteDueScheduledPosts(db, AFTER);

		expect(second).toEqual({ postIds: [] });
		expect(await readPost(dueId)).toEqual({
			status: "published",
			publishedAt: DUE,
			scheduledAt: null,
		});
	});

	it("publishes posts due strictly before now", async () => {
		const result = await promoteDueScheduledPosts(
			db,
			new Date(DUE.getTime() + 1),
		);

		expect(result).toEqual({ postIds: [dueId] });
	});

	it("leaves future, deleted, draft, and archived posts alone", async () => {
		await promoteDueScheduledPosts(db, BEFORE);

		expect((await readPost(futureId))?.status).toBe("scheduled");
		expect((await readPost(deletedId))?.status).toBe("scheduled");
		expect((await readPost(draftId))?.status).toBe("draft");
		expect((await readPost(archivedId))?.status).toBe("archived");

		const result = await promoteDueScheduledPosts(db, DUE);

		expect(result).toEqual({ postIds: [dueId] });
		expect((await readPost(futureId))?.status).toBe("scheduled");
		expect((await readPost(deletedId))?.status).toBe("scheduled");
	});

	it("does nothing on an empty schedule", async () => {
		await promoteDueScheduledPosts(db, DUE);

		expect(await promoteDueScheduledPosts(db, AFTER)).toEqual({
			postIds: [],
		});
	});
});
