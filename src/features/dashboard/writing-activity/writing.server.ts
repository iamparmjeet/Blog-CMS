import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db } from "#/db";
import { settings, writingActivity } from "#/db/schema";
import type { WritingActivityHeatmap } from "./writing.types";
import {
	buildWritingActivityHeatmap,
	getDateKeyInTimeZone,
	getHeatmapStartDate,
	resolveTimeZone,
} from "./writing.utils";

interface ReadWritingActivityInput {
	userId: string;
	now?: Date;
}

export function readWritingActivity({
	userId,
	now = new Date(),
}: ReadWritingActivityInput): WritingActivityHeatmap {
	const preference = db
		.select({
			timeZone: settings.timeZone,
		})
		.from(settings)
		.where(eq(settings.userId, userId))
		.get();

	const timeZone = resolveTimeZone(preference?.timeZone);
	const today = getDateKeyInTimeZone(now, timeZone);
	const startDate = getHeatmapStartDate(today);

	const rows = db
		.select({
			activityDate: writingActivity.activityDate,
			wordsAdded: writingActivity.wordsAdded,
		})
		.from(writingActivity)
		.where(
			and(
				eq(writingActivity.userId, userId),
				gte(writingActivity.activityDate, startDate),
				lte(writingActivity.activityDate, today),
			),
		)
		.orderBy(asc(writingActivity.activityDate))
		.all();

	return buildWritingActivityHeatmap({
		rows,
		today,
		timeZone,
	});
}
