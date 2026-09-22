import { eq } from "drizzle-orm";
import { getDb } from "#/db";
import { settings } from "#/db/schema";
import { resolveTimeZone } from "#/features/dashboard/writing-activity/writing.utils";
import {
	insertPostDraft,
	type PostSearchOptions,
	selectDeletedPostRowsByOwner,
	selectPostEditorRowByOwner,
	selectPostRowsByOwner,
} from "./posts.query";
import type {
	CreatedPostDraft,
	PostEditorData,
	PostListItem,
} from "./posts.types";
import { toPostEditorData, toPostListItem } from "./posts.utils";

interface ReadPostsByOwnerInput {
	userId: string;
	query?: string;
}

export async function readPostsByOwner({
	userId,
	query,
}: ReadPostsByOwnerInput): Promise<PostListItem[]> {
	const options: PostSearchOptions = query ? { query } : {};
	const rows = await selectPostRowsByOwner(getDb(), userId, options);

	return rows.map(toPostListItem);
}

export async function readDeletedPostsByOwner({
	userId,
	query,
}: ReadPostsByOwnerInput): Promise<PostListItem[]> {
	const options: PostSearchOptions = query ? { query } : {};
	const rows = await selectDeletedPostRowsByOwner(getDb(), userId, options);

	return rows.map(toPostListItem);
}

interface CreatePostDraftInput {
	userId: string;
	title?: string;
}

export async function createPostDraft({
	userId,
	title,
}: CreatePostDraftInput): Promise<CreatedPostDraft> {
	return insertPostDraft(getDb(), { userId, title });
}

interface ReadPostEditorByOwnerInput {
	userId: string;
	postId: number;
}

export async function readPostEditorByOwner({
	userId,
	postId,
}: ReadPostEditorByOwnerInput): Promise<PostEditorData> {
	const row = await selectPostEditorRowByOwner(getDb(), userId, postId);

	if (!row) {
		throw new Error("Post not found");
	}

	const preference = await getDb()
		.select({ timeZone: settings.timeZone })
		.from(settings)
		.where(eq(settings.userId, userId))
		.get();

	return toPostEditorData(row, resolveTimeZone(preference?.timeZone));
}
