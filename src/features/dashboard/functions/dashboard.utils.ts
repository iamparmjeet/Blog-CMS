import z from "zod";
import { parsePostStatus } from "#/features/posts/functions/posts.utils";
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

function serializeDate(date: Date): string {
	if (Number.isNaN(date.getTime())) {
		throw new Error("Dashboard received an invalid post date");
	}

	return date.toISOString();
}
