import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "#/db";
import { posts } from "#/db/schema";
import { selectDashboardPostRowsByOwner } from "#/features/dashboard/functions/dashboard.query";
import { applyPostLifecycleAction } from "./post-lifecycle.query";
import { selectPostRowsByOwner } from "./posts.query";

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
			updated_at integer NOT NULL,
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
		title = "Lifecycle post",
		slug = "lifecycle-post",
		deletedAt,
	}: {
		userId?: string;
		status?: "draft" | "published" | "scheduled" | "archived";
		title?: string;
		slug?: string;
		deletedAt?: Date;
	} = {},
) {
	const [post] = await db
		.insert(posts)
		.values({
			userId,
			status,
			title,
			slug,
			deletedAt,
			createdAt: new Date("2026-01-01T00:00:00.000Z"),
			updatedAt: new Date("2026-01-01T00:00:00.000Z"),
		})
		.returning({ id: posts.id });

	if (!post) {
		throw new Error("Could not seed post");
	}

	return post.id;
}

describe("applyPostLifecycleAction", () => {
	let db: Db;

	beforeEach(() => {
		db = createThrowawayDb();
	});

	it("publishes, unpublishes, archives, and restores the draft lifecycle", async () => {
		const postId = await insertPost(db);
		const publishedAt = new Date("2026-02-03T04:05:06.000Z");

		await applyPostLifecycleAction(db, {
			userId: OWNER,
			postIds: [postId],
			action: "publish",
			now: publishedAt,
		});

		let [stored] = await db
			.select({ status: posts.status, publishedAt: posts.publishedAt })
			.from(posts)
			.where(eq(posts.id, postId));
		expect(stored).toEqual({ status: "published", publishedAt });

		await applyPostLifecycleAction(db, {
			userId: OWNER,
			postIds: [postId],
			action: "unpublish",
		});
		await applyPostLifecycleAction(db, {
			userId: OWNER,
			postIds: [postId],
			action: "archive",
		});
		await applyPostLifecycleAction(db, {
			userId: OWNER,
			postIds: [postId],
			action: "unarchive",
		});

		[stored] = await db
			.select({ status: posts.status, publishedAt: posts.publishedAt })
			.from(posts)
			.where(eq(posts.id, postId));
		expect(stored).toEqual({ status: "draft", publishedAt });
	});

	it("soft-deletes and restores bulk selections without exposing them to normal reads", async () => {
		const firstPostId = await insertPost(db, { slug: "first" });
		const secondPostId = await insertPost(db, { slug: "second" });

		await applyPostLifecycleAction(db, {
			userId: OWNER,
			postIds: [firstPostId, secondPostId],
			action: "trash",
			now: new Date("2026-02-03T04:05:06.000Z"),
		});

		expect(await selectPostRowsByOwner(db, OWNER)).toEqual([]);
		expect(await selectDashboardPostRowsByOwner(db, OWNER)).toEqual([]);

		await applyPostLifecycleAction(db, {
			userId: OWNER,
			postIds: [firstPostId, secondPostId],
			action: "restore",
		});

		expect(
			(await selectPostRowsByOwner(db, OWNER)).map((post) => post.id),
		).toEqual([firstPostId, secondPostId]);
	});

	it("purges only already deleted posts", async () => {
		const postId = await insertPost(db, {
			deletedAt: new Date("2026-02-01T00:00:00.000Z"),
		});

		await applyPostLifecycleAction(db, {
			userId: OWNER,
			postIds: [postId],
			action: "purge",
		});

		expect(
			await db.select({ id: posts.id }).from(posts).where(eq(posts.id, postId)),
		).toEqual([]);
	});

	it("rejects invalid transitions, foreign posts, and invalid metadata", async () => {
		const draftPostId = await insertPost(db);
		const foreignPostId = await insertPost(db, {
			userId: OTHER_OWNER,
			slug: "foreign",
		});
		const invalidMetadataPostId = await insertPost(db, {
			title: "",
			slug: "invalid-metadata",
		});

		await expect(
			applyPostLifecycleAction(db, {
				userId: OWNER,
				postIds: [draftPostId],
				action: "unpublish",
			}),
		).rejects.toThrow("Cannot unpublish the selected posts");
		await expect(
			applyPostLifecycleAction(db, {
				userId: OWNER,
				postIds: [foreignPostId],
				action: "trash",
			}),
		).rejects.toThrow("Post not found");
		await expect(
			applyPostLifecycleAction(db, {
				userId: OWNER,
				postIds: [invalidMetadataPostId],
				action: "publish",
			}),
		).rejects.toThrow("Post metadata must be valid before publishing");
	});
});
