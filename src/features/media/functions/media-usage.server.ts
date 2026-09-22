import { env } from "cloudflare:workers";
import { getDb } from "#/db";
import { deleteReadyMediaByOwner } from "./media-upload.query";
import {
	collectMediaUsage,
	isBlockingMediaUsage,
	type MediaUsageReference,
} from "./media-usage";
import {
	selectMediaForOwner,
	selectOwnerPostBodies,
} from "./media-usage.query";

interface MediaOwnerInput {
	mediaId: number;
	userId: string;
}

interface DeleteMediaOwnerInput extends MediaOwnerInput {
	acknowledgeUsage?: boolean;
}

export async function readMediaUsageForOwner({
	mediaId,
	userId,
}: MediaOwnerInput): Promise<MediaUsageReference[]> {
	const db = getDb();
	const mediaRow = await selectMediaForOwner(db, userId, mediaId);

	if (!mediaRow || mediaRow.status !== "ready") {
		throw new Error("Media not found");
	}

	return collectMediaUsage(await selectOwnerPostBodies(db, userId), {
		id: mediaRow.id,
		previewUrl: mediaRow.previewUrl,
		url: mediaRow.url,
	});
}

export async function deleteMediaForOwner({
	acknowledgeUsage = false,
	mediaId,
	userId,
}: DeleteMediaOwnerInput): Promise<{ deleted: true; mediaId: number }> {
	const db = getDb();
	const mediaRow = await selectMediaForOwner(db, userId, mediaId);

	if (!mediaRow || mediaRow.status !== "ready") {
		throw new Error("Media not found");
	}

	const usage = collectMediaUsage(await selectOwnerPostBodies(db, userId), {
		id: mediaRow.id,
		previewUrl: mediaRow.previewUrl,
		url: mediaRow.url,
	});
	const blocking = usage.filter(isBlockingMediaUsage);

	if (blocking.length > 0) {
		const titles = blocking.map((reference) => reference.title).join(", ");
		throw new Error(
			`This media is embedded in published posts: ${titles}. Remove it from those posts before deleting.`,
		);
	}

	if (usage.length > 0 && !acknowledgeUsage) {
		throw new Error(
			"This media is still referenced by posts. Confirm the deletion to continue.",
		);
	}

	const objectKeys = [mediaRow.fileKey, mediaRow.previewKey].filter(
		(key): key is string => Boolean(key),
	);

	if (objectKeys.length > 0) {
		await env.MEDIA.delete(objectKeys);
	}

	const deleted = deleteReadyMediaByOwner(db, userId, mediaId);

	if (!deleted) {
		throw new Error("Media could not be deleted");
	}

	return { deleted: true, mediaId };
}
