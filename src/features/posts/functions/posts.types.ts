export type PostStatus = "draft" | "published" | "scheduled" | "archived";

export interface PostListItem {
	id: number;
	title: string;
	slug: string;
	status: PostStatus;
	wordCount: number;
	updatedAt: string;
}

export interface CreatedPostDraft {
	id: number;
	title: string;
	slug: string;
}
