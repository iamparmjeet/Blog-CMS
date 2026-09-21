import { getDb } from "#/db";
import { toMediaItem } from "../media.utils";
import { selectReadyMediaByOwner } from "./media-upload.query";

export async function readReadyMediaByOwner(userId: string) {
	const rows = await selectReadyMediaByOwner(getDb(), userId);

	return rows.map(toMediaItem);
}
