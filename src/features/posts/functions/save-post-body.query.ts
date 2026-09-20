import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "#/db";
import { posts, settings, writingActivity } from "#/db/schema";
import {
	getDateKeyInTimeZone,
	resolveTimeZone,
} from "#/features/dashboard/writing-activity/writing.utils";
import {
	countWords,
	parseIncomingPostBody,
	serializePostBody,
} from "./post-body";

export const savePostBodyInputSchema = z.object({
	postId: z.number().int().positive(),
	body: z.string().max(1_000_000),
});

export type SavePostBodyInput = z.infer<typeof savePostBodyInputSchema>;

export interface UpdatePostBodyInput extends SavePostBodyInput {
	userId: string;
	now?: Date;
}

export async function updatePostBody(
	db: Db,
	{ userId, postId, body, now = new Date() }: UpdatePostBodyInput,
) {
	const document = parseIncomingPostBody(body);
	const wordCount = countWords(document);

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
		.select({ timeZone: settings.timeZone })
		.from(settings)
		.where(eq(settings.userId, userId))
		.get();

	const activityDate = getDateKeyInTimeZone(
		now,
		resolveTimeZone(preference?.timeZone),
	);
	const wordsAdded = Math.max(0, wordCount - existingPost.wordCount);

	const updatePost = db
		.update(posts)
		.set({
			body: serializePostBody(document),
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

	if (wordsAdded === 0) {
		await db.batch([updatePost]);
	} else {
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
					wordsAdded: sql`${writingActivity.wordsAdded} + ${wordsAdded}`,
					updatedAt: now,
				},
			});

		await db.batch([updatePost, recordActivity]);
	}

	return { postId, wordCount, wordsAdded, activityDate };
}
