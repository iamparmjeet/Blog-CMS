import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "#/db";
import { settings, writingActivity } from "#/db/schema";
import type { WritingActivity } from "#/features/writing-activity/writing.types";
import {
	buildWritingActivity,
	normalizeTimeZone,
	shiftDateKey,
	toDateKey,
	WRITING_ACTIVITY_DAY_COUNT,
} from "#/features/writing-activity/writing.utils";

interface DashboardActivityData {
	accentColor: string;
	activity: WritingActivity;
}

export function readDashboardActivity(
	userId: string,
	now = new Date(),
): DashboardActivityData {
	const configuredSettings = db
		.select({
			accentColor: settings.accentColor,
			timeZone: settings.timeZone,
		})
		.from(settings)
		.where(eq(settings.userId, userId))
		.get();

	const timeZone = normalizeTimeZone(configuredSettings?.timeZone);
	const endDate = toDateKey(now, timeZone);
	const startDate = shiftDateKey(endDate, -(WRITING_ACTIVITY_DAY_COUNT - 1));

	const rows = db
		.select({
			date: writingActivity.date,
			wordsAdded: writingActivity.wordsAdded,
			wordsDeleted: writingActivity.wordsDeleted,
			saveCount: writingActivity.saveCount,
		})
		.from(writingActivity)
		.where(
			and(
				eq(writingActivity.userId, userId),
				gte(writingActivity.date, startDate),
				lte(writingActivity.date, endDate),
			),
		)
		.all();

	return {
		accentColor: normalizeAccentColor(configuredSettings?.accentColor),
		activity: buildWritingActivity(rows, timeZone, now),
	};
}

function normalizeAccentColor(value: string | null | undefined): string {
	return /^#[\da-f]{6}$/i.test(value ?? "") ? (value as string) : "#7c3aed";
}
