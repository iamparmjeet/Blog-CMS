import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSession } from "#/lib/auth/auth.server";
import { readOwnerSlugsExcluding, readPostEditorByOwner } from "./posts.server";

const getPostEditorInputSchema = z.object({
	postId: z.coerce.number().int().positive(),
});

export const getPostEditor = createServerFn({
	method: "GET",
})
	.validator(getPostEditorInputSchema)
	.handler(async ({ data }) => {
		const session = await requireSession();
		const userId = session.user.id;

		const [post, takenSlugs] = await Promise.all([
			readPostEditorByOwner({ userId, postId: data.postId }),
			readOwnerSlugsExcluding({ userId, postId: data.postId }),
		]);

		return { post, takenSlugs };
	});
