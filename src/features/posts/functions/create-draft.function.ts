import { createServerFn } from "@tanstack/react-start";
import z from "zod";
import { requireSession } from "#/lib/auth/auth.server";
import { createPostDraft } from "./posts.server";
import { MAX_POST_TITLE_LENGTH } from "./posts.utils";

export const createDraftInputSchema = z.object({
	title: z.string().trim().max(MAX_POST_TITLE_LENGTH).optional(),
});

export const createDraft = createServerFn({ method: "POST" })
	.validator(createDraftInputSchema)
	.handler(async ({ data }) => {
		const session = await requireSession();

		return createPostDraft({
			userId: session.user.id,
			title: data.title,
		});
	});
