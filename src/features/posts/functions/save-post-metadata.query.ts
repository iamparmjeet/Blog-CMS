import { and, eq, isNull, ne } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "#/db";
import { posts } from "#/db/schema";
import { postMetadataSchema } from "./post-metadata";

export const savePostMetadataInputSchema = postMetadataSchema.extend({
	postId: z.number().int().positive(),
});

export type SavePostMetadataInput = z.infer<typeof savePostMetadataInputSchema>;

export interface UpdatePostMetadataInput extends SavePostMetadataInput {
	userId: string;
	now?: Date;
}

export async function updatePostMetadata(
	db: Db,
	{
		userId,
		postId,
		title,
		slug,
		seoTitle,
		description,
		now = new Date(),
	}: UpdatePostMetadataInput,
) {
	const existingPost = await db
		.select({ id: posts.id, slug: posts.slug, status: posts.status })
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

	if (existingPost.status === "published" && existingPost.slug !== slug) {
		throw new Error("Published post slugs cannot be changed");
	}

	const conflictingPost = await db
		.select({ id: posts.id })
		.from(posts)
		.where(
			and(eq(posts.userId, userId), eq(posts.slug, slug), ne(posts.id, postId)),
		)
		.get();

	if (conflictingPost) {
		throw new Error("That slug is already in use");
	}

	try {
		const [updated] = await db
			.update(posts)
			.set({ title, slug, seoTitle, description, updatedAt: now })
			.where(
				and(
					eq(posts.id, postId),
					eq(posts.userId, userId),
					isNull(posts.deletedAt),
				),
			)
			.returning({
				id: posts.id,
				title: posts.title,
				slug: posts.slug,
				seoTitle: posts.seoTitle,
				description: posts.description,
				updatedAt: posts.updatedAt,
			});

		if (!updated) {
			throw new Error("Post not found");
		}

		return updated;
	} catch (error) {
		if (isSlugConflict(error)) {
			throw new Error("That slug is already in use");
		}

		throw error;
	}
}

function isSlugConflict(error: unknown): boolean {
	return (
		error instanceof Error &&
		(error.message.includes("posts_user_id_slug_unique") ||
			error.message.includes("posts.user_id, posts.slug"))
	);
}
