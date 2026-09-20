import { z } from "zod";
import { MAX_POST_SLUG_LENGTH, MAX_POST_TITLE_LENGTH } from "./posts.utils";

export const MAX_POST_DESCRIPTION_LENGTH = 320;

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const postMetadataSchema = z.object({
	title: z
		.string()
		.trim()
		.min(1, "Title is required")
		.max(
			MAX_POST_TITLE_LENGTH,
			`Title must be ${MAX_POST_TITLE_LENGTH} characters or fewer`,
		),
	slug: z
		.string()
		.min(1, "Slug is required")
		.max(
			MAX_POST_SLUG_LENGTH,
			`Slug must be ${MAX_POST_SLUG_LENGTH} characters or fewer`,
		)
		.regex(
			slugPattern,
			"Use lowercase letters, numbers, and single hyphens only",
		),
	seoTitle: z
		.string()
		.trim()
		.max(
			MAX_POST_TITLE_LENGTH,
			`SEO title must be ${MAX_POST_TITLE_LENGTH} characters or fewer`,
		),
	description: z
		.string()
		.trim()
		.max(
			MAX_POST_DESCRIPTION_LENGTH,
			`SEO description must be ${MAX_POST_DESCRIPTION_LENGTH} characters or fewer`,
		),
});

export type PostMetadata = z.infer<typeof postMetadataSchema>;

export function getPostMetadataValidationError(
	metadata: PostMetadata,
): string | null {
	const result = postMetadataSchema.safeParse(metadata);

	return result.success
		? null
		: (result.error.issues[0]?.message ?? "Invalid metadata");
}
