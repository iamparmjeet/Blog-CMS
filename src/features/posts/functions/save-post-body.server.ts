import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "#/db";
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

export async function updatePostBody({
	userId,
	postId,
	body,
	now = new Date(),
}: UpdatePostBodyInput) {
	const db = getDb();

	const existingPost = await db
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

	const preference = await db
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

	const updatePost = db
		.update(posts)
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
		);

	if (wordsAdded > 0) {
		const recordActivity = db
			.insert(writingActivity)
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
			});

		await db.batch([updatePost, recordActivity]);
	} else {
		await db.batch([updatePost]);
	}

	return {
		postId,
		wordCount,
		wordsAdded,
		activityDate,
	};
}

export function countWords(body: string): number {
	const normalized = body.trim();

	if (!normalized) return 0;

	return normalized.split(/\s+/u).length;
}
