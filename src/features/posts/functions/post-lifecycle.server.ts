import { getDb } from "#/db";
import {
	applyPostLifecycleAction,
	type PostLifecycleInput,
} from "./post-lifecycle.query";

interface ApplyPostLifecycleActionForOwnerInput extends PostLifecycleInput {
	userId: string;
}

export function applyPostLifecycleActionForOwner({
	userId,
	postIds,
	action,
}: ApplyPostLifecycleActionForOwnerInput) {
	return applyPostLifecycleAction(getDb(), { userId, postIds, action });
}
