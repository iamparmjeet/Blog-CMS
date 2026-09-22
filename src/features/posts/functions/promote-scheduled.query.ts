import { and, eq, inArray, isNull, lte, sql } from "drizzle-orm";
import type { Db } from "#/db";
import { posts } from "#/db/schema";

export interface PromotedScheduledPosts {
	postIds: number[];
}

/**
 * Publishes every due scheduled post exactly once. The UPDATE re-checks
 * `status = 'scheduled'`, so overlapping cron invocations cannot promote a
 * post twice, and `coalesce` keeps the first promotion instant stable.
 */
export async function promoteDueScheduledPosts(
	db: Db,
	now = new Date(),
): Promise<PromotedScheduledPosts> {
	const due = await db
		.select({ id: posts.id })
		.from(posts)
		.where(
			and(
				eq(posts.status, "scheduled"),
				isNull(posts.deletedAt),
				lte(posts.scheduledAt, now),
			),
		);

	if (due.length === 0) {
		return { postIds: [] };
	}

	const ids = due.map((row) => row.id);

	const promoted = await db
		.update(posts)
		.set({
			status: "published",
			publishedAt: sql`coalesce(${posts.publishedAt}, ${now.getTime()})`,
			scheduledAt: null,
			updatedAt: now,
		})
		.where(
			and(
				inArray(posts.id, ids),
				eq(posts.status, "scheduled"),
				isNull(posts.deletedAt),
			),
		)
		.returning({ id: posts.id });

	return { postIds: promoted.map((row) => row.id) };
}
