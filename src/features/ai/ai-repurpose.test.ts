import { describe, expect, it } from "vitest";
import { extractPlainText } from "#/features/posts/functions/post-body";
import type { GenerationProfile } from "./ai-prompts";
import {
	buildRepurposeMessages,
	PLATFORM_LABELS,
	REPURPOSE_PLATFORMS,
	repurposeInputSchema,
} from "./ai-repurpose";

const PROFILE: GenerationProfile = {
	defaultModel: "google/gemini-2.5-flash",
	writingSample: "",
	writingStyle: "Direct.",
};

describe("repurpose platforms", () => {
	it("supports exactly the four D7 formats with visible labels", () => {
		expect([...REPURPOSE_PLATFORMS]).toEqual([
			"twitter",
			"linkedin",
			"instagram",
			"reels",
		]);
		expect(PLATFORM_LABELS.twitter).toContain("Twitter");
		expect(PLATFORM_LABELS.linkedin).toContain("LinkedIn");
		expect(PLATFORM_LABELS.instagram).toContain("Instagram");
		expect(PLATFORM_LABELS.reels).toContain("Reels");
	});
});

describe("repurposeInputSchema", () => {
	it("rejects an unknown platform so no provider call is attempted", () => {
		expect(() =>
			repurposeInputSchema.parse({ postId: 1, platform: "tiktok" }),
		).toThrow();
	});

	it("rejects a missing postId", () => {
		expect(() => repurposeInputSchema.parse({ platform: "twitter" })).toThrow();
	});

	it("accepts a valid request", () => {
		expect(
			repurposeInputSchema.parse({ postId: 3, platform: "linkedin" }),
		).toEqual({ postId: 3, platform: "linkedin" });
	});
});

describe("buildRepurposeMessages", () => {
	it("labels the target format and carries the source text", () => {
		const messages = buildRepurposeMessages({
			profile: PROFILE,
			platform: "twitter",
			title: "Compost guide",
			sourceText: "Compost happens fast.",
		});

		expect(messages).toHaveLength(2);
		expect(messages[0]?.role).toBe("system");
		expect(messages[0]?.content).toContain("Twitter");
		expect(messages[0]?.content).toContain("Direct.");
		expect(messages[1]?.content).toContain("Compost guide");
		expect(messages[1]?.content).toContain("Compost happens fast.");
	});

	it("gives each format distinct instructions", () => {
		const systems = REPURPOSE_PLATFORMS.map(
			(platform) =>
				buildRepurposeMessages({
					profile: PROFILE,
					platform,
					title: "T",
					sourceText: "S",
				})[0]?.content,
		);

		expect(new Set(systems).size).toBe(REPURPOSE_PLATFORMS.length);
	});

	it("truncates an overlong source instead of dropping it", () => {
		const messages = buildRepurposeMessages({
			profile: PROFILE,
			platform: "linkedin",
			title: "T",
			sourceText: `prefix-${"x".repeat(20_000)}`,
		});

		expect(messages[1]?.content).toContain("prefix-");
		expect(messages[1]?.content.length ?? 0).toBeLessThan(20_000);
	});
});

describe("extractPlainText", () => {
	it("reads headings, paragraphs, and list items in order", () => {
		expect(
			extractPlainText({
				type: "doc",
				content: [
					{
						type: "heading",
						content: [{ type: "text", text: "Title" }],
					},
					{
						type: "paragraph",
						content: [{ type: "text", text: "Body text." }],
					},
					{
						type: "bulletList",
						content: [
							{
								type: "listItem",
								content: [
									{
										type: "paragraph",
										content: [{ type: "text", text: "First" }],
									},
								],
							},
						],
					},
				],
			}),
		).toBe("Title\nBody text.\nFirst");
	});

	it("returns an empty string for an empty document", () => {
		expect(extractPlainText({ type: "doc", content: [] })).toBe("");
	});
});
