import { and, desc, eq, isNull } from "drizzle-orm";
import type { Db } from "#/db";
import { user } from "#/db/auth-schema";
import { posts, settings } from "#/db/schema";
import type { FeedPublishedPostRow, FeedSettingsSnapshot } from "./feed.types";

export async function selectInstanceOwnerId(db: Db): Promise<string | null> {
	const row = await db
		.select({ id: user.id })
		.from(user)
		.orderBy(user.createdAt)
		.limit(1)
		.get();

	return row?.id ?? null;
}

export async function selectFeedSettings(
	db: Db,
	userId: string,
): Promise<FeedSettingsSnapshot | null> {
	const row = await db
		.select({
			allowedOrigins: settings.allowedOrigins,
			blogTitle: settings.blogTitle,
			domain: settings.domain,
			bio: settings.bio,
		})
		.from(settings)
		.where(eq(settings.userId, userId))
		.limit(1)
		.get();

	if (!row) {
		return null;
	}

	return {
		allowedOrigins: row.allowedOrigins ?? "",
		blogTitle: row.blogTitle,
		domain: row.domain,
		bio: row.bio,
	};
}

const publishedOwnerFilter = (userId: string) =>
	and(
		eq(posts.userId, userId),
		eq(posts.status, "published"),
		isNull(posts.deletedAt),
	);

export async function selectPublishedFeedPosts(
	db: Db,
	userId: string,
	limit = 100,
): Promise<FeedPublishedPostRow[]> {
	return db
		.select({
			title: posts.title,
			slug: posts.slug,
			seoTitle: posts.seoTitle,
			description: posts.description,
			body: posts.body,
			publishedAt: posts.publishedAt,
			updatedAt: posts.updatedAt,
			wordCount: posts.wordCount,
		})
		.from(posts)
		.where(publishedOwnerFilter(userId))
		.orderBy(desc(posts.publishedAt), desc(posts.updatedAt))
		.limit(limit);
}

export async function selectPublishedFeedPostBySlug(
	db: Db,
	userId: string,
	slug: string,
): Promise<FeedPublishedPostRow | undefined> {
	return db
		.select({
			title: posts.title,
			slug: posts.slug,
			seoTitle: posts.seoTitle,
			description: posts.description,
			body: posts.body,
			publishedAt: posts.publishedAt,
			updatedAt: posts.updatedAt,
			wordCount: posts.wordCount,
		})
		.from(posts)
		.where(and(publishedOwnerFilter(userId), eq(posts.slug, slug)))
		.limit(1)
		.get();
}
