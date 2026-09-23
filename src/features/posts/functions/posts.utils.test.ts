import { describe, expect, it } from "vitest";
import type { PostStatus } from "./posts.types";
import {
	normalizePostTitle,
	slugFollowsTitle,
	slugForTitle,
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

describe("slugForTitle", () => {
	it("derives a slug from the title", () => {
		expect(slugForTitle("Why I Ditched Notion", new Set())).toBe(
			"why-i-ditched-notion",
		);
	});

	it("falls back to untitled for an empty title", () => {
		expect(slugForTitle("", new Set())).toBe("untitled");
	});

	it("suffixes when the derived slug is taken", () => {
		expect(slugForTitle("Same Title", new Set(["same-title"]))).toBe(
			"same-title-2",
		);
	});

	it("caps the derived slug length", () => {
		expect(slugForTitle("a".repeat(200), new Set())).toHaveLength(80);
	});
});

describe("slugFollowsTitle", () => {
	function input(overrides: {
		title?: string;
		slug?: string;
		status?: PostStatus;
		takenSlugs?: ReadonlySet<string>;
	}) {
		return {
			title: "My Post",
			slug: "my-post",
			status: "draft" as PostStatus,
			takenSlugs: new Set<string>(),
			...overrides,
		};
	}

	it("follows while the slug matches the title", () => {
		expect(slugFollowsTitle(input({}))).toBe(true);
	});

	it("follows an auto-suffixed slug", () => {
		expect(
			slugFollowsTitle(
				input({ slug: "my-post-2", takenSlugs: new Set(["my-post"]) }),
			),
		).toBe(true);
	});

	it("stops following once the slug was customized", () => {
		expect(slugFollowsTitle(input({ slug: "custom-url" }))).toBe(false);
	});

	it("never follows for published posts", () => {
		expect(slugFollowsTitle(input({ status: "published" }))).toBe(false);
		expect(
			slugFollowsTitle(input({ slug: "custom-url", status: "published" })),
		).toBe(false);
	});

	it("follows for scheduled and archived posts", () => {
		expect(slugFollowsTitle(input({ status: "scheduled" }))).toBe(true);
		expect(slugFollowsTitle(input({ status: "archived" }))).toBe(true);
	});
});

describe("toPostListItem", () => {
	it("throws when a stored status violates the lifecycle contract", () => {
		expect(() =>
			toPostListItem({
				id: 7,
				title: "Test post",
				slug: "test-post",
				status: "deleted",
				wordCount: 0,
				updatedAt: new Date("2026-07-22T10:00:00.000Z"),
			}),
		).toThrow("Received invalid post status: deleted");
	});

	it("normalizes title, status, word count and date", () => {
		const item = toPostListItem({
			id: 7,
			title: "   ",
			slug: "untitled",
			status: "draft",
			wordCount: -5,
			updatedAt: new Date("2026-07-22T10:00:00.000Z"),
		});

		expect(item).toEqual({
			id: 7,
			title: UNTITLED_POST_TITLE,
			slug: "untitled",
			status: "draft",
			wordCount: 0,
			updatedAt: "2026-07-22T10:00:00.000Z",
		});
	});
});
