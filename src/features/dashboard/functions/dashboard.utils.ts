import z from "zod";
import { parsePostStatus } from "#/features/posts/functions/posts.utils";
import type { WritingActivityHeatmap } from "../writing-activity/writing.types";
import type { DashboardStats, DashboardSummary } from "./dashboard.types";

export const DEFAULT_ACCENT_COLOR = "#7c3aed";

const AccentColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export interface DashboardPostRow {
	id: number;
	title: string;
	status: string;
	wordCount: number;
	updatedAt: Date;
}

export function buildDashboardData(
	rows: readonly DashboardPostRow[],
	accentColor: string | null | undefined,
): DashboardSummary {
	const posts = [...rows]
		.sort(
			(first, second) => second.updatedAt.getTime() - first.updatedAt.getTime(),
		)
		.map((row) => ({
			id: row.id,
			title: row.title.trim() || "Untitled",
			status: parsePostStatus(row.status),
			wordCount: Math.max(0, row.wordCount),
			updatedAt: serializeDate(row.updatedAt),
		}));

	const stats = posts.reduce<DashboardStats>(
		(result, post) => {
			result.totalPosts += 1;
			result.totalWords += post.wordCount;

			if (post.status === "published") {
				result.publishedPosts += 1;
			}

			if (post.status === "draft") {
				result.draftPosts += 1;
			}

			return result;
		},
		{
			totalWords: 0,
			totalPosts: 0,
			publishedPosts: 0,
			draftPosts: 0,
		},
	);

	return {
		accentColor: normalizeAccentColor(accentColor),
		stats,
		continuePost: posts.find((post) => post.status === "draft") ?? null,
		recentPosts: posts.slice(0, 4),
	};
}

// ******** Supporting functions ************
export function normalizeAccentColor(
	accentColor: string | null | undefined,
): string {
	const result = AccentColorSchema.safeParse(accentColor);

	return result.success ? result.data : DEFAULT_ACCENT_COLOR;
}

export function getGreeting(date: Date): string {
	const hours = date.getHours();

	if (hours < 12) {
		return "Good morning";
	}

	if (hours < 18) {
		return "Good afternoon";
	}

	return "Good evening";
}

export interface ActivitySummary {
	bestDay: number;
	bestWeek: number;
	currentStreak: number;
	dailyAverage: number;
	thisWeek: number;
}

export function summarizeActivity(
	activity: WritingActivityHeatmap,
): ActivitySummary {
	const pastDays = activity.cells.filter((cell) => !cell.isFuture);
	const lastSevenDays = pastDays.slice(-7);
	const thisWeek = lastSevenDays.reduce(
		(sum, cell) => sum + cell.wordsAdded,
		0,
	);
	const totalWords = pastDays.reduce((sum, cell) => sum + cell.wordsAdded, 0);
	const activeDays = pastDays.filter((cell) => cell.wordsAdded > 0).length;
	const bestDay = pastDays.reduce(
		(max, cell) => Math.max(max, cell.wordsAdded),
		0,
	);

	let currentStreak = 0;

	for (let index = pastDays.length - 1; index >= 0; index -= 1) {
		const cell = pastDays[index];

		if (!cell || cell.wordsAdded <= 0) {
			break;
		}

		currentStreak += 1;
	}

	let bestWeek = 0;

	for (let end = pastDays.length; end > 0; end -= 7) {
		const week = pastDays
			.slice(Math.max(0, end - 7), end)
			.reduce((sum, cell) => sum + cell.wordsAdded, 0);
		bestWeek = Math.max(bestWeek, week);
	}

	return {
		bestDay,
		bestWeek,
		currentStreak,
		dailyAverage: activeDays === 0 ? 0 : Math.round(totalWords / activeDays),
		thisWeek,
	};
}

function serializeDate(date: Date): string {
	if (Number.isNaN(date.getTime())) {
		throw new Error("Dashboard received an invalid post date");
	}

	return date.toISOString();
}
