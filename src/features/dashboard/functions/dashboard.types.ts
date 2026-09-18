import type { WritingActivityHeatmap } from "../writing-activity/writing.types";

export type DashboardPostStatus =
	| "draft"
	| "published"
	| "scheduled"
	| "archived"
	| "unknown";

export interface DashboardPostSummary {
	id: number;
	title: string;
	status: DashboardPostStatus;
	wordCount: number;
	updatedAt: string;
}

export interface DashboardStats {
	totalWords: number;
	totalPosts: number;
	publishedPosts: number;
	draftPosts: number;
}

export interface DashboardSummary {
	accentColor: string;
	stats: DashboardStats;
	continuePost: DashboardPostSummary | null;
	recentPosts: DashboardPostSummary[];
}

export interface DashboardData extends DashboardSummary {
	activity: WritingActivityHeatmap;
}
