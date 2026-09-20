import { getDb } from "#/db";
import { insertPostDraft, selectPostRowsByOwner } from "./posts.query";
import type { CreatedPostDraft, PostListItem } from "./posts.types";
import { toPostListItem } from "./posts.utils";

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
