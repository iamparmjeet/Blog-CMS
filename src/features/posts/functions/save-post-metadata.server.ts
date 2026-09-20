import { getDb } from "#/db";
import {
	type UpdatePostMetadataInput,
	updatePostMetadata,
} from "./save-post-metadata.query";

export function savePostMetadataForOwner(input: UpdatePostMetadataInput) {
	return updatePostMetadata(getDb(), input);
}
