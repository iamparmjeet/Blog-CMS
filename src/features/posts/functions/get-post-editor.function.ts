import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSession } from "#/lib/auth/auth.server";
import { readPostEditorByOwner } from "./posts.server";

const getPostEditorInputSchema = z.object({
	postId: z.coerce.number().int().positive(),
});

export const getPostEditor = createServerFn({
	method: "GET",
})
	.validator(getPostEditorInputSchema)
	.handler(async ({ data }) => {
		const session = await requireSession();

		return readPostEditorByOwner({
			userId: session.user.id,
			postId: data.postId,
		});
	});
