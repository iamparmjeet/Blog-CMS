import { and, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "#/db";
import { posts } from "#/db/schema";
import { postMetadataSchema } from "./post-metadata";
import { parsePostStatus } from "./posts.utils";

const postLifecycleActions = [
	"publish",
	"unpublish",
	"archive",
	"unarchive",
	"trash",
	"restore",
	"purge",
] as const;

export type PostLifecycleAction = (typeof postLifecycleActions)[number];

export const postLifecycleInputSchema = z.object({
	action: z.enum(postLifecycleActions),
	postIds: z
		.array(z.number().int().positive())
		.min(1)
		.max(100)
		.refine(
			(postIds) => new Set(postIds).size === postIds.length,
			"Post IDs must be unique",
		),
});

export type PostLifecycleInput = z.infer<typeof postLifecycleInputSchema>;

interface ApplyPostLifecycleActionInput extends PostLifecycleInput {
	userId: string;
	now?: Date;
}

export async function applyPostLifecycleAction(
	db: Db,
	{ userId, postIds, action, now = new Date() }: ApplyPostLifecycleActionInput,
) {
	const selectedPosts = await db
		.select({
			id: posts.id,
			title: posts.title,
			slug: posts.slug,
			seoTitle: posts.seoTitle,
			description: posts.description,
			status: posts.status,
			deletedAt: posts.deletedAt,
		})
		.from(posts)
		.where(and(eq(posts.userId, userId), inArray(posts.id, postIds)));

	if (selectedPosts.length !== postIds.length) {
		throw new Error("Post not found");
	}

	for (const post of selectedPosts) {
		assertLifecycleActionAllowed(action, post);
	}

	const ownerSelection = and(
		eq(posts.userId, userId),
		inArray(posts.id, postIds),
	);

	switch (action) {
		case "publish": {
			const updated = await db
				.update(posts)
				.set({
					status: "published",
					publishedAt: sql`coalesce(${posts.publishedAt}, ${now.getTime()})`,
					scheduledAt: null,
					updatedAt: now,
				})
				.where(and(ownerSelection, isNull(posts.deletedAt)))
				.returning({ id: posts.id });

			return assertAllPostsChanged(updated, postIds);
		}
		case "unpublish":
		case "unarchive": {
			const updated = await db
				.update(posts)
				.set({ status: "draft", scheduledAt: null, updatedAt: now })
				.where(and(ownerSelection, isNull(posts.deletedAt)))
				.returning({ id: posts.id });

			return assertAllPostsChanged(updated, postIds);
		}
		case "archive": {
			const updated = await db
				.update(posts)
				.set({ status: "archived", scheduledAt: null, updatedAt: now })
				.where(and(ownerSelection, isNull(posts.deletedAt)))
				.returning({ id: posts.id });

			return assertAllPostsChanged(updated, postIds);
		}
		case "trash": {
			const updated = await db
				.update(posts)
				.set({ deletedAt: now, updatedAt: now })
				.where(and(ownerSelection, isNull(posts.deletedAt)))
				.returning({ id: posts.id });

			return assertAllPostsChanged(updated, postIds);
		}
		case "restore": {
			const updated = await db
				.update(posts)
				.set({ deletedAt: null, updatedAt: now })
				.where(and(ownerSelection, isNotNull(posts.deletedAt)))
				.returning({ id: posts.id });

			return assertAllPostsChanged(updated, postIds);
		}
		case "purge": {
			const deleted = await db
				.delete(posts)
				.where(and(ownerSelection, isNotNull(posts.deletedAt)))
				.returning({ id: posts.id });

			return assertAllPostsChanged(deleted, postIds);
		}
	}
}

function assertLifecycleActionAllowed(
	action: PostLifecycleAction,
	post: {
		title: string;
		slug: string;
		seoTitle: string;
		description: string;
		status: string;
		deletedAt: Date | null;
	},
) {
	const status = parsePostStatus(post.status);
	const isDeleted = post.deletedAt !== null;

	if (action === "publish") {
		const metadata = postMetadataSchema.safeParse(post);
		if (!metadata.success) {
			throw new Error("Post metadata must be valid before publishing");
		}
		if (!isDeleted && status === "draft") {
			return;
		}
	}

	if (action === "unpublish" && !isDeleted && status === "published") {
		return;
	}

	if (
		action === "archive" &&
		!isDeleted &&
		(status === "draft" || status === "published" || status === "scheduled")
	) {
		return;
	}

	if (action === "unarchive" && !isDeleted && status === "archived") {
		return;
	}

	if (action === "trash" && !isDeleted) {
		return;
	}

	if ((action === "restore" || action === "purge") && isDeleted) {
		return;
	}

	throw new Error(`Cannot ${action} the selected posts`);
}

function assertAllPostsChanged(
	changedPosts: { id: number }[],
	postIds: number[],
) {
	if (changedPosts.length !== postIds.length) {
		throw new Error("One or more posts changed before this action completed");
	}

	return { postIds: changedPosts.map((post) => post.id) };
}
