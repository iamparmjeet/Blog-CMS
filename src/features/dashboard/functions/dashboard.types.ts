import type { PostStatus } from "#/features/posts/functions/posts.types";
import type { WritingActivityHeatmap } from "../writing-activity/writing.types";

export interface DashboardPostSummary {
	id: number;
	title: string;
	status: PostStatus;
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
