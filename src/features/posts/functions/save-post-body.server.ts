import { getDb } from "#/db";
import {
	type UpdatePostBodyInput,
	updatePostBody,
} from "./save-post-body.query";

export function savePostBodyForOwner(input: UpdatePostBodyInput) {
	return updatePostBody(getDb(), input);
}
