import { describe, expect, it } from "vitest";
import {
	countWords,
	createEmptyPostBody,
	parseIncomingPostBody,
	parseStoredPostBody,
} from "./post-body";

describe("parseStoredPostBody", () => {
	it("returns an empty document when a post has no body", () => {
		expect(parseStoredPostBody(null)).toEqual(createEmptyPostBody());
	});

	it("converts legacy plain text into paragraphs", () => {
		expect(parseStoredPostBody("First line\n\nThird line")).toEqual({
			type: "doc",
			content: [
				{
					type: "paragraph",
					content: [{ type: "text", text: "First line" }],
				},
				{ type: "paragraph", content: [] },
				{
					type: "paragraph",
					content: [{ type: "text", text: "Third line" }],
				},
			],
		});
	});
});

describe("parseIncomingPostBody", () => {
	it("rejects malformed and non-document JSON", () => {
		expect(() => parseIncomingPostBody("not json")).toThrow(
			"Post body must be valid TipTap JSON",
		);
		expect(() => parseIncomingPostBody('{"type":"paragraph"}')).toThrow(
			"Post body must be valid TipTap JSON",
		);
	});
});

describe("countWords", () => {
	it("counts text across rich-text blocks", () => {
		const document = parseIncomingPostBody(
			JSON.stringify({
				type: "doc",
				content: [
					{
						type: "heading",
						content: [{ type: "text", text: "Three word heading" }],
					},
					{
						type: "bulletList",
						content: [
							{
								type: "listItem",
								content: [
									{
										type: "paragraph",
										content: [{ type: "text", text: "two words" }],
									},
								],
							},
						],
					},
				],
			}),
		);

		expect(countWords(document)).toBe(5);
	});
});
