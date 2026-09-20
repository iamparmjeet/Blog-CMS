import { parseStoredPostBody } from "./post-body";
import type {
	PostEditorData,
	PostEditorRow,
	PostListItem,
	PostRow,
	PostStatus,
} from "./posts.types";

export const UNTITLED_POST_TITLE = "Untitled";
export const MAX_POST_TITLE_LENGTH = 200;
export const MAX_POST_SLUG_LENGTH = 80;

export function parsePostStatus(status: string): PostStatus {
	switch (status) {
		case "draft":
		case "published":
		case "scheduled":
		case "archived":
			return status;
		default:
			throw new Error(`Received invalid post status: ${status}`);
	}
}

export function normalizePostTitle(title: string | null | undefined): string {
	const trimmed = title?.trim() ?? "";

	if (!trimmed) {
		return UNTITLED_POST_TITLE;
	}

	return trimmed.slice(0, MAX_POST_TITLE_LENGTH);
}

export function slugify(title: string): string {
	const slug = title
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/gu, "")
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/gu, "")
		.trim()
		.replace(/[\s-]+/gu, "-")
		.replace(/^-+|-+$/gu, "");

	return (slug || "untitled").slice(0, MAX_POST_SLUG_LENGTH);
}

export function uniqueSlug(base: string, taken: ReadonlySet<string>): string {
	if (!taken.has(base)) {
		return base;
	}

	let suffix = 2;

	while (taken.has(`${base}-${suffix}`)) {
		suffix += 1;
	}

	return `${base}-${suffix}`;
}

export function toPostListItem(row: PostRow): PostListItem {
	return {
		id: row.id,
		title: normalizePostTitle(row.title),
		slug: row.slug,
		status: parsePostStatus(row.status),
		wordCount: Math.max(0, row.wordCount),
		updatedAt: serializePostDate(row.updatedAt),
	};
}

export function toPostEditorData(row: PostEditorRow): PostEditorData {
	return {
		id: row.id,
		title: normalizePostTitle(row.title),
		slug: row.slug,
		status: parsePostStatus(row.status),
		seoTitle: row.seoTitle,
		description: row.description,
		body: parseStoredPostBody(row.body),
		wordCount: Math.max(0, row.wordCount),
		updatedAt: serializePostDate(row.updatedAt),
	};
}

function serializePostDate(date: Date): string {
	if (Number.isNaN(date.getTime())) {
		throw new Error("Received a post with an invalid updated date");
	}

	return date.toISOString();
}
