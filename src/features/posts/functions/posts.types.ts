import type { PostBodyDocument } from "./post-body";

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

export interface PostEditorData {
	id: number;
	title: string;
	slug: string;
	seoTitle: string;
	description: string;
	body: PostBodyDocument;
	wordCount: number;
	updatedAt: string;
}

export interface PostEditorRow {
	id: number;
	title: string;
	slug: string;
	seoTitle: string;
	description: string;
	body: string | null;
	wordCount: number;
	updatedAt: Date;
}

export interface PostRow {
	id: number;
	title: string;
	slug: string;
	status: string;
	wordCount: number;
	updatedAt: Date;
}
