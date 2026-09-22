import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "#/db";
import { posts, settings } from "#/db/schema";
import { resolveTimeZone } from "#/features/dashboard/writing-activity/writing.utils";
import { postMetadataSchema } from "./post-metadata";
import { zonedDateTimeToUtc } from "./schedule-time";

export const savePostScheduleInputSchema = z.object({
	postId: z.number().int().positive(),
	dateTimeLocal: z.string().max(32).nullable(),
});

export type SavePostScheduleInput = z.infer<typeof savePostScheduleInputSchema>;

interface SavePostScheduleForOwnerInput extends SavePostScheduleInput {
	userId: string;
	now?: Date;
}

export interface SavedPostSchedule {
	postId: number;
	status: "draft" | "scheduled";
	scheduledAt: string | null;
}

export async function savePostSchedule(
	db: Db,
	{
		userId,
		postId,
		dateTimeLocal,
		now = new Date(),
	}: SavePostScheduleForOwnerInput,
): Promise<SavedPostSchedule> {
	const row = await db
		.select({
			id: posts.id,
			title: posts.title,
			slug: posts.slug,
			seoTitle: posts.seoTitle,
			description: posts.description,
			status: posts.status,
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

	if (!row) {
		throw new Error("Post not found");
	}

	if (dateTimeLocal === null) {
		if (row.status !== "scheduled") {
			throw new Error("This post is not scheduled");
		}

		await db
			.update(posts)
			.set({ status: "draft", scheduledAt: null, updatedAt: now })
			.where(
				and(
					eq(posts.id, postId),
					eq(posts.userId, userId),
					isNull(posts.deletedAt),
				),
			);

		return { postId, status: "draft", scheduledAt: null };
	}

	if (row.status !== "draft" && row.status !== "scheduled") {
		throw new Error("Cannot schedule a post that is not a draft");
	}

	const metadata = postMetadataSchema.safeParse({
		title: row.title,
		slug: row.slug,
		seoTitle: row.seoTitle,
		description: row.description,
	});

	if (!metadata.success) {
		throw new Error("Post metadata must be valid before scheduling");
	}

	const preference = await db
		.select({ timeZone: settings.timeZone })
		.from(settings)
		.where(eq(settings.userId, userId))
		.get();

	const scheduledAt = zonedDateTimeToUtc(
		dateTimeLocal,
		resolveTimeZone(preference?.timeZone),
	);

	if (scheduledAt.getTime() <= now.getTime()) {
		throw new Error("The scheduled time must be in the future");
	}

	await db
		.update(posts)
		.set({ status: "scheduled", scheduledAt, updatedAt: now })
		.where(
			and(
				eq(posts.id, postId),
				eq(posts.userId, userId),
				isNull(posts.deletedAt),
			),
		);

	return {
		postId,
		status: "scheduled",
		scheduledAt: scheduledAt.toISOString(),
	};
}
