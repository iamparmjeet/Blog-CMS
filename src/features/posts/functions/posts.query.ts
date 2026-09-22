import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "#/db";
import { posts } from "#/db/schema";
import { extractPlainText, parseStoredPostBody } from "./post-body";
import type { CreatedPostDraft, PostEditorRow, PostRow } from "./posts.types";
import { normalizePostTitle, slugify, uniqueSlug } from "./posts.utils";

export interface PostSearchOptions {
	query?: string;
}

export const MAX_POST_SEARCH_LENGTH = 64;

export const listPostsInputSchema = z.object({
	query: z.string().trim().max(MAX_POST_SEARCH_LENGTH).optional(),
});

function matchesSearch(
	row: {
		title: string;
		slug: string;
		description: string;
		body: string | null;
	},
	needle: string,
): boolean {
	const haystacks = [
		row.title,
		row.slug,
		row.description,
		extractPlainText(parseStoredPostBody(row.body)),
	];

	return haystacks.some((haystack) => haystack.toLowerCase().includes(needle));
}

export async function selectPostRowsByOwner(
	db: Db,
	userId: string,
	options: PostSearchOptions = {},
): Promise<PostRow[]> {
	const needle = options.query?.trim().toLowerCase() ?? "";

	if (!needle) {
		return db
			.select({
				id: posts.id,
				title: posts.title,
				slug: posts.slug,
				status: posts.status,
				wordCount: posts.wordCount,
				updatedAt: posts.updatedAt,
			})
			.from(posts)
			.where(and(eq(posts.userId, userId), isNull(posts.deletedAt)))
			.orderBy(desc(posts.updatedAt));
	}

	const candidates = await db
		.select({
			id: posts.id,
			title: posts.title,
			slug: posts.slug,
			status: posts.status,
			description: posts.description,
			body: posts.body,
			wordCount: posts.wordCount,
			updatedAt: posts.updatedAt,
		})
		.from(posts)
		.where(and(eq(posts.userId, userId), isNull(posts.deletedAt)))
		.orderBy(desc(posts.updatedAt));

	return candidates
		.filter((row) =>
			matchesSearch(
				{
					title: row.title,
					slug: row.slug,
					description: row.description,
					body: row.body,
				},
				needle,
			),
		)
		.map((row) => ({
			id: row.id,
			title: row.title,
			slug: row.slug,
			status: row.status,
			wordCount: row.wordCount,
			updatedAt: row.updatedAt,
		}));
}

export async function selectDeletedPostRowsByOwner(
	db: Db,
	userId: string,
	options: PostSearchOptions = {},
): Promise<PostRow[]> {
	const needle = options.query?.trim().toLowerCase() ?? "";

	const base = {
		id: posts.id,
		title: posts.title,
		slug: posts.slug,
		status: posts.status,
		wordCount: posts.wordCount,
		updatedAt: posts.updatedAt,
	};

	if (!needle) {
		return db
			.select(base)
			.from(posts)
			.where(and(eq(posts.userId, userId), isNotNull(posts.deletedAt)))
			.orderBy(desc(posts.updatedAt));
	}

	const candidates = await db
		.select({
			...base,
			description: posts.description,
			body: posts.body,
		})
		.from(posts)
		.where(and(eq(posts.userId, userId), isNotNull(posts.deletedAt)))
		.orderBy(desc(posts.updatedAt));

	return candidates
		.filter((row) =>
			matchesSearch(
				{
					title: row.title,
					slug: row.slug,
					description: row.description,
					body: row.body,
				},
				needle,
			),
		)
		.map((row) => ({
			id: row.id,
			title: row.title,
			slug: row.slug,
			status: row.status,
			wordCount: row.wordCount,
			updatedAt: row.updatedAt,
		}));
}

export async function selectPostEditorRowByOwner(
	db: Db,
	userId: string,
	postId: number,
): Promise<PostEditorRow | undefined> {
	return db
		.select({
			id: posts.id,
			title: posts.title,
			slug: posts.slug,
			status: posts.status,
			seoTitle: posts.seoTitle,
			description: posts.description,
			body: posts.body,
			scheduledAt: posts.scheduledAt,
			wordCount: posts.wordCount,
			updatedAt: posts.updatedAt,
		})
		.from(posts)
		.where(
			and(
				eq(posts.id, postId),
				eq(posts.userId, userId),
				isNull(posts.deletedAt),
			),
		)
		.get();
}

interface InsertPostDraftInput {
	userId: string;
	title?: string | null;
	now?: Date;
}

export async function insertPostDraft(
	db: Db,
	{ userId, title, now = new Date() }: InsertPostDraftInput,
): Promise<CreatedPostDraft> {
	const normalizedTitle = normalizePostTitle(title);

	const takenSlugs = await db
		.select({ slug: posts.slug })
		.from(posts)
		.where(eq(posts.userId, userId));

	const slug = uniqueSlug(
		slugify(normalizedTitle),
		new Set(takenSlugs.map((row) => row.slug)),
	);

	const [created] = await db
		.insert(posts)
		.values({
			userId,
			title: normalizedTitle,
			slug,
			status: "draft",
			wordCount: 0,
			revision: 0,
			createdAt: now,
			updatedAt: now,
		})
		.returning({
			id: posts.id,
			title: posts.title,
			slug: posts.slug,
		});

	if (!created) {
		throw new Error("Failed to create a post draft");
	}

	return created;
}
