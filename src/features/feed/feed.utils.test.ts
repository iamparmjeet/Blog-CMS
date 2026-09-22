import { describe, expect, it } from "vitest";
import type { FeedPublishedPostRow } from "./feed.types";
import {
	buildFeedPostUrl,
	evaluateFeedCors,
	isOriginAllowed,
	normalizeOrigin,
	parseAllowedOrigins,
	sanitizeFeedBody,
	toFeedPost,
} from "./feed.utils";

describe("parseAllowedOrigins", () => {
	it("splits on newlines, commas, and whitespace", () => {
		expect(
			parseAllowedOrigins(
				"https://a.example\nhttps://b.example, https://c.example;https://d.example",
			),
		).toEqual([
			"https://a.example",
			"https://b.example",
			"https://c.example",
			"https://d.example",
		]);
	});

	it("normalizes scheme-less origins to https and deduplicates", () => {
		expect(
			parseAllowedOrigins("site.example\nhttps://site.example\nSITE.EXAMPLE"),
		).toEqual(["https://site.example"]);
	});

	it("drops invalid and non-http entries", () => {
		expect(parseAllowedOrigins("not a url\nftp://files.example\n")).toEqual([]);
	});

	it("returns an empty list for null or empty input", () => {
		expect(parseAllowedOrigins(null)).toEqual([]);
		expect(parseAllowedOrigins("")).toEqual([]);
		expect(parseAllowedOrigins(undefined)).toEqual([]);
	});
});

describe("normalizeOrigin / isOriginAllowed", () => {
	it("normalizes to a URL origin without a trailing slash", () => {
		expect(normalizeOrigin("https://Site.Example/path")).toBe(
			"https://site.example",
		);
	});

	it("matches allowlisted origins case-insensitively on the host", () => {
		const allowed = parseAllowedOrigins("https://blog.example");

		expect(isOriginAllowed("https://blog.example", allowed)).toBe(true);
		expect(isOriginAllowed("https://other.example", allowed)).toBe(false);
		expect(isOriginAllowed(null, allowed)).toBe(false);
	});

	it("denies everything when the allowlist is empty", () => {
		expect(isOriginAllowed("https://blog.example", [])).toBe(false);
	});
});

describe("evaluateFeedCors", () => {
	it("allows non-browser requests without an Origin header", () => {
		const request = new Request("https://cms.example/api/posts");
		const decision = evaluateFeedCors(request, []);

		expect(decision.allowed).toBe(true);
		expect(decision.headers["Access-Control-Allow-Origin"]).toBeUndefined();
		expect(decision.headers["Cache-Control"]).toBe("public, max-age=60");
	});

	it("grants CORS to an allowlisted origin on GET", () => {
		const request = new Request("https://cms.example/api/posts", {
			headers: { Origin: "https://site-a.com" },
		});
		const decision = evaluateFeedCors(request, ["https://site-a.com"]);

		expect(decision.allowed).toBe(true);
		expect(decision.headers["Access-Control-Allow-Origin"]).toBe(
			"https://site-a.com",
		);
		expect(decision.headers.Vary).toBe("Origin");
	});

	it("denies a disallowed origin without granting CORS", () => {
		const request = new Request("https://cms.example/api/posts", {
			headers: { Origin: "https://evil.example" },
		});
		const decision = evaluateFeedCors(request, ["https://site-a.com"]);

		expect(decision.allowed).toBe(false);
		expect(decision.headers["Access-Control-Allow-Origin"]).toBeUndefined();
	});

	it("answers preflight with allow-methods headers for allowlisted origins", () => {
		const request = new Request("https://cms.example/api/posts", {
			headers: {
				Origin: "https://site-a.com",
				"Access-Control-Request-Method": "GET",
			},
			method: "OPTIONS",
		});
		const decision = evaluateFeedCors(request, ["https://site-a.com"]);

		expect(decision.allowed).toBe(true);
		expect(decision.headers["Access-Control-Allow-Methods"]).toBe(
			"GET, OPTIONS",
		);
		expect(decision.headers["Access-Control-Allow-Headers"]).toBe(
			"Content-Type",
		);
	});

	it("denies preflight from a disallowed origin", () => {
		const request = new Request("https://cms.example/api/posts", {
			headers: { Origin: "https://evil.example" },
			method: "OPTIONS",
		});
		const decision = evaluateFeedCors(request, ["https://site-a.com"]);

		expect(decision.allowed).toBe(false);
		expect(decision.headers["Access-Control-Allow-Methods"]).toBeUndefined();
	});
});

describe("buildFeedPostUrl", () => {
	it("prefers the configured domain", () => {
		expect(
			buildFeedPostUrl({
				domain: "https://blog.example",
				requestUrl: "https://cms.example/api/posts",
				slug: "hello",
			}),
		).toBe("https://blog.example/posts/hello");
	});

	it("accepts a bare domain as https", () => {
		expect(
			buildFeedPostUrl({
				domain: "blog.example",
				requestUrl: "https://cms.example/api/posts",
				slug: "hello",
			}),
		).toBe("https://blog.example/posts/hello");
	});

	it("falls back to the request origin when no domain is set", () => {
		expect(
			buildFeedPostUrl({
				domain: null,
				requestUrl: "http://localhost:3000/api/posts",
				slug: "hello",
			}),
		).toBe("http://localhost:3000/posts/hello");
	});
});

describe("sanitizeFeedBody", () => {
	it("keeps safe https media sources", () => {
		const body = sanitizeFeedBody({
			type: "doc",
			content: [
				{
					type: "mediaAsset",
					attrs: { src: "https://cdn.example/media/1.png", mediaId: 1 },
				},
			],
		});

		expect(body.content?.[0]?.attrs?.src).toBe(
			"https://cdn.example/media/1.png",
		);
	});

	it("drops media nodes with javascript or missing sources", () => {
		const body = sanitizeFeedBody({
			type: "doc",
			content: [
				{ type: "mediaAsset", attrs: { src: "javascript:alert(1)" } },
				{ type: "image", attrs: {} },
				{ type: "paragraph", content: [{ type: "text", text: "keep" }] },
			],
		});

		expect(body.content).toHaveLength(1);
		expect(body.content?.[0]?.type).toBe("paragraph");
	});

	it("strips unsafe link hrefs while keeping the text", () => {
		const body = sanitizeFeedBody({
			type: "doc",
			content: [
				{
					type: "paragraph",
					content: [
						{
							type: "text",
							text: "click",
							marks: [{ type: "link", attrs: { href: "javascript:x" } }],
						},
					],
				},
			],
		});

		const mark = body.content?.[0]?.content?.[0]?.marks?.[0];

		expect(mark?.attrs?.href).toBeUndefined();
		expect(body.content?.[0]?.content?.[0]?.text).toBe("click");
	});

	it("keeps root-relative links", () => {
		const body = sanitizeFeedBody({
			type: "doc",
			content: [
				{
					type: "paragraph",
					content: [
						{
							type: "text",
							text: "home",
							marks: [{ type: "link", attrs: { href: "/about" } }],
						},
					],
				},
			],
		});

		expect(body.content?.[0]?.content?.[0]?.marks?.[0]?.attrs?.href).toBe(
			"/about",
		);
	});
});

describe("toFeedPost", () => {
	const row: FeedPublishedPostRow = {
		title: "Hello",
		slug: "hello",
		seoTitle: "Hello SEO",
		description: "A greeting",
		body: JSON.stringify({
			type: "doc",
			content: [{ type: "paragraph" }],
		}),
		publishedAt: new Date("2026-09-01T00:00:00.000Z"),
		updatedAt: new Date("2026-09-02T00:00:00.000Z"),
		wordCount: 12,
	};

	it("serializes dates, clamps word count, and builds the public URL", () => {
		const post = toFeedPost(row, {
			domain: "https://blog.example",
			requestUrl: "http://localhost:3000/api/posts",
		});

		expect(post).toMatchObject({
			slug: "hello",
			title: "Hello",
			seoTitle: "Hello SEO",
			description: "A greeting",
			publishedAt: "2026-09-01T00:00:00.000Z",
			updatedAt: "2026-09-02T00:00:00.000Z",
			wordCount: 12,
			url: "https://blog.example/posts/hello",
		});
		expect(post.body.type).toBe("doc");
	});

	it("clamps a negative word count to zero", () => {
		const post = toFeedPost(
			{ ...row, wordCount: -5 },
			{ domain: null, requestUrl: "http://localhost:3000/api/posts" },
		);

		expect(post.wordCount).toBe(0);
	});
});
