import { and, eq, isNull } from "drizzle-orm";
import type { Db } from "#/db";
import { media, posts } from "#/db/schema";

export function selectOwnerPostBodies(db: Db, userId: string) {
	return db
		.select({
			body: posts.body,
			deletedAt: posts.deletedAt,
			id: posts.id,
			status: posts.status,
			title: posts.title,
		})
		.from(posts)
		.where(eq(posts.userId, userId));
}

export function selectMediaForOwner(db: Db, userId: string, mediaId: number) {
	return db
		.select({
			fileKey: media.fileKey,
			id: media.id,
			name: media.name,
			previewKey: media.previewKey,
			previewUrl: media.previewUrl,
			status: media.status,
			url: media.url,
		})
		.from(media)
		.where(
			and(
				eq(media.id, mediaId),
				eq(media.userId, userId),
				isNull(media.deletedAt),
			),
		)
		.get();
}
