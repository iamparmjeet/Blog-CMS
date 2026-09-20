import { createServerFn } from "@tanstack/react-start";
import { requireSession } from "#/lib/auth/auth.server";
import { savePostBodyInputSchema } from "./save-post-body.query";
import { savePostBodyForOwner } from "./save-post-body.server";

export const savePostBody = createServerFn({
	method: "POST",
})
	.validator(savePostBodyInputSchema)
	.handler(async ({ data }) => {
		const session = await requireSession();

		return savePostBodyForOwner({
			userId: session.user.id,
			postId: data.postId,
			body: data.body,
		});
	});
