import { createServerFn } from "@tanstack/react-start";
import { requireSession } from "#/lib/auth/auth.server";
import {
	savePostBodyInputSchema,
	updatePostBody,
} from "./save-post-body.server";

export const savePostBody = createServerFn({
	method: "POST",
})
	.inputValidator(savePostBodyInputSchema)
	.handler(async ({ data }) => {
		const session = await requireSession();

		return updatePostBody({
			userId: session.user.id,
			postId: data.postId,
			body: data.body,
		});
	});
