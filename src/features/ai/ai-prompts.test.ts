import { describe, expect, it } from "vitest";
import {
	buildChatMessages,
	buildSystemPrompt,
	type GenerationProfile,
	generateInputSchema,
	resolveModel,
} from "./ai-prompts";

const EMPTY_PROFILE: GenerationProfile = {
	defaultModel: "",
	writingSample: "",
	writingStyle: "",
};

describe("buildSystemPrompt", () => {
	it("returns a base drafting instruction when the profile is empty", () => {
		const system = buildSystemPrompt(EMPTY_PROFILE);

		expect(system).toContain("blog");
		expect(system).not.toContain("Writing style");
		expect(system).not.toContain("Writing sample");
	});

	it("steers with the saved writing style when present", () => {
		const system = buildSystemPrompt({
			...EMPTY_PROFILE,
			writingStyle: "Direct, short sentences.",
		});

		expect(system).toContain("Direct, short sentences.");
	});

	it("includes the writing sample so the model can match voice", () => {
		const system = buildSystemPrompt({
			...EMPTY_PROFILE,
			writingSample: "I write like this.",
		});

		expect(system).toContain("I write like this.");
	});

	it("truncates an overlong sample instead of dropping it", () => {
		const system = buildSystemPrompt({
			...EMPTY_PROFILE,
			writingSample: `prefix-${"x".repeat(10_000)}`,
		});

		expect(system).toContain("prefix-");
		expect(system.length).toBeLessThan(10_000);
	});
});

describe("buildChatMessages", () => {
	it("places the system prompt first and the owner prompt second", () => {
		const messages = buildChatMessages({
			profile: EMPTY_PROFILE,
			prompt: "Draft an intro about composting.",
		});

		expect(messages).toHaveLength(2);
		expect(messages[0]?.role).toBe("system");
		expect(messages[1]).toEqual({
			role: "user",
			content: "Draft an intro about composting.",
		});
	});

	it("adds the open post title as context when provided", () => {
		const messages = buildChatMessages({
			profile: EMPTY_PROFILE,
			prompt: "Draft an intro.",
			postContext: { title: "My compost guide" },
		});

		expect(messages[1]?.content).toContain("My compost guide");
		expect(messages[1]?.content).toContain("Draft an intro.");
	});
});

describe("resolveModel", () => {
	it("prefers an explicit override over the saved default", () => {
		expect(
			resolveModel(
				{ ...EMPTY_PROFILE, defaultModel: "z-ai/glm-5.3-flash" },
				"openai/gpt-5.6-luna",
			),
		).toBe("openai/gpt-5.6-luna");
	});

	it("falls back to the saved profile model", () => {
		expect(
			resolveModel({
				...EMPTY_PROFILE,
				defaultModel: "deepseek/deepseek-v4-flash-0731",
			}),
		).toBe("deepseek/deepseek-v4-flash-0731");
	});

	it("falls back to the built-in default when nothing is configured", () => {
		expect(resolveModel(EMPTY_PROFILE)).toBe("z-ai/glm-5.3-flash");
	});
});

describe("generateInputSchema", () => {
	it("rejects an empty prompt so no provider call is attempted", () => {
		expect(() => generateInputSchema.parse({ prompt: "   " })).toThrow();
	});

	it("rejects an overlong prompt", () => {
		expect(() =>
			generateInputSchema.parse({ prompt: "x".repeat(4001) }),
		).toThrow();
	});

	it("rejects a postId that cannot exist", () => {
		expect(() =>
			generateInputSchema.parse({ prompt: "Draft.", postId: -2 }),
		).toThrow();
	});

	it("accepts a minimal valid request", () => {
		expect(generateInputSchema.parse({ prompt: "Draft an intro." })).toEqual({
			prompt: "Draft an intro.",
		});
	});
});
