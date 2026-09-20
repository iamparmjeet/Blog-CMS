import { eq } from "drizzle-orm";
import { getDb } from "#/db";
import { settings } from "#/db/schema";
import { readWritingActivity } from "../writing-activity/writing.server";
import { selectDashboardPostRowsByOwner } from "./dashboard.query";
import type { DashboardData } from "./dashboard.types";
import { buildDashboardData } from "./dashboard.utils";

interface ReadDashboardDataInput {
	userId: string;
}

export async function readDashboardData({
	userId,
}: ReadDashboardDataInput): Promise<DashboardData> {
	const db = getDb();

	const [postRows, settingsRows] = await Promise.all([
		selectDashboardPostRowsByOwner(db, userId),

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
}
