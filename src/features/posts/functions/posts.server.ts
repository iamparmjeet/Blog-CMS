import { getDb } from "#/db";
import {
	insertPostDraft,
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
}

export async function readPostsByOwner({
	userId,
}: ReadPostsByOwnerInput): Promise<PostListItem[]> {
	const rows = await selectPostRowsByOwner(getDb(), userId);

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
	return toPostEditorData(row);
}
