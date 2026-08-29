import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "#/db";
import { posts, settings, writingActivity } from "#/db/schema";
import {
	getDateKeyInTimeZone,
	resolveTimeZone,
} from "#/features/dashboard/writing-activity/writing.utils";

export const savePostBodyInputSchema = z.object({
	postId: z.number().int().positive(),
	body: z.string().max(1_000_000),
});

export type SavePostBodyInput = z.infer<typeof savePostBodyInputSchema>;

interface UpdatePostBodyInput extends SavePostBodyInput {
	userId: string;
	now?: Date;
}

export function updatePostBody({
	userId,
	postId,
	body,
	now = new Date(),
}: UpdatePostBodyInput) {
	return db.transaction((tx) => {
		const existingPost = tx
			.select({
				id: posts.id,
				wordCount: posts.wordCount,
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

		if (!existingPost) {
			throw new Error("Post not found");
		}

		const preference = tx
			.select({
				timeZone: settings.timeZone,
			})
			.from(settings)
			.where(eq(settings.userId, userId))
			.get();

		const timeZone = resolveTimeZone(preference?.timeZone);
		const activityDate = getDateKeyInTimeZone(now, timeZone);
		const wordCount = countWords(body);

		// Deleting words must not remove previously earned activity.
		const wordsAdded = Math.max(0, wordCount - existingPost.wordCount);

		tx.update(posts)
			.set({
				body,
				wordCount,
				updatedAt: now,
			})
			.where(
				and(
					eq(posts.id, postId),
					eq(posts.userId, userId),
					isNull(posts.deletedAt),
				),
			)
			.run();

		if (wordsAdded > 0) {
			tx.insert(writingActivity)
				.values({
					userId,
					activityDate,
					wordsAdded,
					updatedAt: now,
				})
				.onConflictDoUpdate({
					target: [writingActivity.userId, writingActivity.activityDate],
					set: {
						wordsAdded: sql`
							${writingActivity.wordsAdded} + ${wordsAdded}
						`,
						updatedAt: now,
					},
				})
				.run();
		}

		return {
			postId,
			wordCount,
			wordsAdded,
			activityDate,
		};
	});
}

export function countWords(body: string): number {
	const normalized = body.trim();

	if (!normalized) return 0;

	return normalized.split(/\s+/u).length;
}
