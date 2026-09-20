import { describe, expect, it } from "vitest";
import { getPostMetadataValidationError } from "./post-metadata";

describe("getPostMetadataValidationError", () => {
	it("accepts complete valid post metadata", () => {
		expect(
			getPostMetadataValidationError({
				title: "Writing in public",
				slug: "writing-in-public",
				seoTitle: "How writing in public works",
				description: "A practical guide to sharing work as it happens.",
			}),
		).toBeNull();
	});

	it("rejects blank titles and malformed slugs", () => {
		expect(
			getPostMetadataValidationError({
				title: " ",
				slug: "writing in public",
				seoTitle: "",
				description: "",
			}),
		).toBe("Title is required");

		expect(
			getPostMetadataValidationError({
				title: "Writing in public",
				slug: "writing in public",
				seoTitle: "",
				description: "",
			}),
		).toBe("Use lowercase letters, numbers, and single hyphens only");
	});
});
