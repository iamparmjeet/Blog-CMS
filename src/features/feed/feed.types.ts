import type { JSONContent } from "@tiptap/core";

export interface FeedPost {
	slug: string;
	title: string;
	description: string;
	seoTitle: string;
	publishedAt: string | null;
	updatedAt: string;
	wordCount: number;
	readingTimeMinutes: number | null;
	url: string;
	body: JSONContent;
}

export interface FeedCollection {
	posts: FeedPost[];
}

export interface FeedSettingsSnapshot {
	allowedOrigins: string;
	blogTitle: string | null;
	domain: string | null;
	bio: string | null;
	seoMeta: boolean;
	rssFeed: boolean;
	readingTime: boolean;
}

export interface FeedPublishedPostRow {
	title: string;
	slug: string;
	seoTitle: string;
	description: string;
	body: string | null;
	publishedAt: Date | null;
	updatedAt: Date;
	wordCount: number;
}
