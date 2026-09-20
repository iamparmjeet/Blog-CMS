import { describe, expect, it } from "vitest";
import {
	normalizePostTitle,
	slugify,
	toPostListItem,
	UNTITLED_POST_TITLE,
	uniqueSlug,
} from "./posts.utils";

describe("normalizePostTitle", () => {
	it("falls back to Untitled for missing or blank titles", () => {
		expect(normalizePostTitle(undefined)).toBe(UNTITLED_POST_TITLE);
		expect(normalizePostTitle(null)).toBe(UNTITLED_POST_TITLE);
		expect(normalizePostTitle("   ")).toBe(UNTITLED_POST_TITLE);
	});

	it("trims and caps the title length", () => {
		expect(normalizePostTitle("  Hello world  ")).toBe("Hello world");
		expect(normalizePostTitle("a".repeat(300))).toHaveLength(200);
	});
});

describe("slugify", () => {
	it("lowercases and hyphenates words", () => {
		expect(slugify("Why I Ditched Notion")).toBe("why-i-ditched-notion");
	});

	it("strips punctuation and diacritics", () => {
		expect(slugify("Café déjà vu! (2026)")).toBe("cafe-deja-vu-2026");
	});

	it("never returns an empty slug", () => {
		expect(slugify("!!!")).toBe("untitled");
	});

	it("caps the slug length", () => {
		expect(slugify("a".repeat(200))).toHaveLength(80);
	});
});

describe("uniqueSlug", () => {
	it("returns the base slug when it is free", () => {
		expect(uniqueSlug("draft", new Set())).toBe("draft");
	});

	it("appends the next free numeric suffix", () => {
		expect(uniqueSlug("draft", new Set(["draft", "draft-2"]))).toBe("draft-3");
	});
});

describe("toPostListItem", () => {
	it("normalizes title, status, word count and date", () => {
		const item = toPostListItem({
			id: 7,
			title: "   ",
			slug: "untitled",
			status: "deleted",
			wordCount: -5,
			updatedAt: new Date("2026-07-22T10:00:00.000Z"),
		});

		expect(item).toEqual({
			id: 7,
			title: UNTITLED_POST_TITLE,
			slug: "untitled",
			status: "unknown",
			wordCount: 0,
			updatedAt: "2026-07-22T10:00:00.000Z",
		});
	});
});
