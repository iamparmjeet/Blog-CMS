import { and, desc, eq, isNull } from "drizzle-orm";
import type { Db } from "#/db";
import { posts } from "#/db/schema";

export function selectDashboardPostRowsByOwner(db: Db, userId: string) {
	return db
		.select({
			id: posts.id,
			title: posts.title,
			status: posts.status,
			wordCount: posts.wordCount,
			updatedAt: posts.updatedAt,
		})
		.from(posts)
		.where(and(eq(posts.userId, userId), isNull(posts.deletedAt)))
		.orderBy(desc(posts.updatedAt));
}
