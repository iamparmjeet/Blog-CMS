import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "#/db";
import { posts, settings } from "#/db/schema";
import { readWritingActivity } from "../writing-activity/writing.server";
import type { DashboardData } from "./dashboard.types";
import { buildDashboardData } from "./dashboard.utils";

interface ReadDashboardDataInput {
	userId: string;
}

export async function readDashboardData({
	userId,
}: ReadDashboardDataInput): Promise<DashboardData> {
	const db = getDb();
	// 1):Select only id, title, status, wordCount and updatedAt.

	const [postRows, settingsRows] = await Promise.all([
		db
			.select({
				id: posts.id,
				title: posts.title,
				status: posts.status,
				wordCount: posts.wordCount,
				updatedAt: posts.updatedAt,
			})
			.from(posts)
			.where(and(eq(posts.userId, userId), isNull(posts.deletedAt)))
			.orderBy(desc(posts.updatedAt)),

		// 2): Fetch the user's accentColor from settings.
		// Use "#7c3aed" when no settings row exists.

		db
			.select({ accentColor: settings.accentColor })
			.from(settings)
			.where(eq(settings.userId, userId))
			.limit(1),
	]);

	const dashboardSummary = buildDashboardData(
		postRows,
		settingsRows[0]?.accentColor,
	);

	const activity = await readWritingActivity({
		userId,
	});

	return {
		...dashboardSummary,
		activity,
	};

	// TODO 4:
	// Calculate totalWords, totalPosts, publishedPosts and draftPosts.
}
