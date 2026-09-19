import type { DashboardPostStatus } from "#/features/dashboard/functions/dashboard.types";

export interface PostListItem {
	id: number;
	title: string;
	slug: string;
	status: DashboardPostStatus;
	wordCount: number;
	updatedAt: string;
}

export interface CreatedPostDraft {
	id: number;
	title: string;
	slug: string;
}
