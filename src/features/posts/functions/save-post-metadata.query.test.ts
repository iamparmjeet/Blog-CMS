import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "#/db";
import { posts } from "#/db/schema";
import { updatePostMetadata } from "./save-post-metadata.query";

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
			CONSTRAINT "posts_user_id_slug_unique" UNIQUE("user_id", "slug")
		);
	`);

	return drizzle(sqlite) as unknown as Db;
}

async function insertPost(
	db: Db,
	{
		userId = OWNER,
		slug = "draft",
		status = "draft",
	}: { userId?: string; slug?: string; status?: "draft" | "published" } = {},
) {
	const [post] = await db
		.insert(posts)
		.values({
			userId,
			title: "Draft",
			slug,
			status,
			createdAt: new Date("2026-01-01T00:00:00.000Z"),
			updatedAt: new Date("2026-01-01T00:00:00.000Z"),
		})
		.returning({ id: posts.id });

	if (!post) {
		throw new Error("Could not seed post");
	}

	return post.id;
}

describe("updatePostMetadata", () => {
	let db: Db;

	beforeEach(() => {
		db = createThrowawayDb();
	});

	it("persists owner metadata without changing the post body", async () => {
		const postId = await insertPost(db);

		const result = await updatePostMetadata(db, {
			userId: OWNER,
			postId,
			title: "Writing in public",
			slug: "writing-in-public",
			seoTitle: "How writing in public works",
			description: "A practical guide to sharing work as it happens.",
			now: new Date("2026-01-02T00:00:00.000Z"),
		});

		expect(result).toMatchObject({
			id: postId,
			title: "Writing in public",
			slug: "writing-in-public",
			seoTitle: "How writing in public works",
			description: "A practical guide to sharing work as it happens.",
		});

		const [stored] = await db
			.select({
				title: posts.title,
				slug: posts.slug,
				seoTitle: posts.seoTitle,
				description: posts.description,
				body: posts.body,
			})
			.from(posts)
			.where(eq(posts.id, postId));

		expect(stored).toEqual({
			title: "Writing in public",
			slug: "writing-in-public",
			seoTitle: "How writing in public works",
			description: "A practical guide to sharing work as it happens.",
			body: null,
		});
	});

	it("rejects duplicate owner slugs but permits the same slug for another owner", async () => {
		await insertPost(db, { slug: "taken" });
		const postId = await insertPost(db, { slug: "available" });

		await expect(
			updatePostMetadata(db, {
				userId: OWNER,
				postId,
				title: "Another draft",
				slug: "taken",
				seoTitle: "",
				description: "",
			}),
		).rejects.toThrow("That slug is already in use");

		const foreignPostId = await insertPost(db, {
			userId: OTHER_OWNER,
			slug: "foreign",
		});
		await expect(
			updatePostMetadata(db, {
				userId: OTHER_OWNER,
				postId: foreignPostId,
				title: "Foreign draft",
				slug: "taken",
				seoTitle: "",
				description: "",
			}),
		).resolves.toMatchObject({ slug: "taken" });
	});

	it("does not let an owner edit another owner's post or rename a published slug", async () => {
		const foreignPostId = await insertPost(db, { userId: OTHER_OWNER });

		await expect(
			updatePostMetadata(db, {
				userId: OWNER,
				postId: foreignPostId,
				title: "Private",
				slug: "private",
				seoTitle: "",
				description: "",
			}),
		).rejects.toThrow("Post not found");

		const publishedPostId = await insertPost(db, {
			slug: "published-post",
			status: "published",
		});
		await expect(
			updatePostMetadata(db, {
				userId: OWNER,
				postId: publishedPostId,
				title: "Published post",
				slug: "renamed-post",
				seoTitle: "",
				description: "",
			}),
		).rejects.toThrow("Published post slugs cannot be changed");
	});

	it("keeps a slug immutable after a post has been unpublished", async () => {
		const postId = await insertPost(db, { slug: "was-published" });

		await db
			.update(posts)
			.set({
				status: "draft",
				publishedAt: new Date("2026-01-02T00:00:00.000Z"),
			})
			.where(eq(posts.id, postId));

		await expect(
			updatePostMetadata(db, {
				userId: OWNER,
				postId,
				title: "Was published",
				slug: "renamed-post",
				seoTitle: "",
				description: "",
			}),
		).rejects.toThrow("Published post slugs cannot be changed");
	});
});
