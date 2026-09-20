import { createServerFn } from "@tanstack/react-start";
import { requireSession } from "#/lib/auth/auth.server";
import { savePostMetadataInputSchema } from "./save-post-metadata.query";
import { savePostMetadataForOwner } from "./save-post-metadata.server";

export const savePostMetadata = createServerFn({
	method: "POST",
})
	.validator(savePostMetadataInputSchema)
	.handler(async ({ data }) => {
		const session = await requireSession();

		return savePostMetadataForOwner({
			userId: session.user.id,
			postId: data.postId,
			title: data.title,
			slug: data.slug,
			seoTitle: data.seoTitle,
			description: data.description,
		});
	});
