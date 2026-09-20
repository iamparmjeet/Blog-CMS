import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import type { Db } from "#/db";
import { posts } from "#/db/schema";
import type { CreatedPostDraft, PostEditorRow, PostRow } from "./posts.types";
import { normalizePostTitle, slugify, uniqueSlug } from "./posts.utils";

export async function selectPostRowsByOwner(
	db: Db,
	userId: string,
): Promise<PostRow[]> {
	return db
		.select({
			id: posts.id,
			title: posts.title,
			slug: posts.slug,
			status: posts.status,
			wordCount: posts.wordCount,
			updatedAt: posts.updatedAt,
		})
		.from(posts)
		.where(and(eq(posts.userId, userId), isNull(posts.deletedAt)))
		.orderBy(desc(posts.updatedAt));
}

export async function selectDeletedPostRowsByOwner(
	db: Db,
	userId: string,
): Promise<PostRow[]> {
	return db
		.select({
			id: posts.id,
			title: posts.title,
			slug: posts.slug,
			status: posts.status,
			wordCount: posts.wordCount,
			updatedAt: posts.updatedAt,
		})
		.from(posts)
		.where(and(eq(posts.userId, userId), isNotNull(posts.deletedAt)))
		.orderBy(desc(posts.updatedAt));
}

export async function selectPostEditorRowByOwner(
	db: Db,
	userId: string,
	postId: number,
): Promise<PostEditorRow | undefined> {
	return db
		.select({
			id: posts.id,
			title: posts.title,
			slug: posts.slug,
			seoTitle: posts.seoTitle,
			description: posts.description,
			body: posts.body,
			wordCount: posts.wordCount,
			updatedAt: posts.updatedAt,
		})
		.from(posts)
		.where(
			and(
				eq(posts.id, postId),
				eq(posts.userId, userId),
				isNull(posts.deletedAt),
			),
		)
		.get();
}

interface InsertPostDraftInput {
	userId: string;
	title?: string | null;
	now?: Date;
}

export async function insertPostDraft(
	db: Db,
	{ userId, title, now = new Date() }: InsertPostDraftInput,
): Promise<CreatedPostDraft> {
	const normalizedTitle = normalizePostTitle(title);

	const takenSlugs = await db
		.select({ slug: posts.slug })
		.from(posts)
		.where(eq(posts.userId, userId));

	const slug = uniqueSlug(
		slugify(normalizedTitle),
		new Set(takenSlugs.map((row) => row.slug)),
	);

	const [created] = await db
		.insert(posts)
		.values({
			userId,
			title: normalizedTitle,
			slug,
			status: "draft",
			wordCount: 0,
			revision: 0,
			createdAt: now,
			updatedAt: now,
		})
		.returning({
			id: posts.id,
			title: posts.title,
			slug: posts.slug,
		});

	if (!created) {
		throw new Error("Failed to create a post draft");
	}

	return created;
}
