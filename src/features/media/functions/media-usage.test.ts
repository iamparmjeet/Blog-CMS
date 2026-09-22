import { describe, expect, it } from "vitest";
import {
	collectMediaUsage,
	isBlockingMediaUsage,
	postBodyReferencesMedia,
} from "./media-usage";

const MEDIA = {
	id: 42,
	previewUrl:
		"https://media.example.com/media/owner-1/u1-hero.png.preview.webp",
	url: "https://media.example.com/media/owner-1/u1-hero.png",
};

function bodyWithMediaAsset(): string {
	return JSON.stringify({
		type: "doc",
		content: [
			{
				type: "paragraph",
				content: [{ text: "Intro", type: "text" }],
			},
			{
				type: "mediaAsset",
				attrs: {
					alt: "hero.png",
					kind: "image",
					mediaId: 42,
					src: MEDIA.url,
				},
			},
		],
	});
}

describe("postBodyReferencesMedia", () => {
	it("detects an inserted media asset by id", () => {
		expect(postBodyReferencesMedia(bodyWithMediaAsset(), MEDIA)).toBe(true);
	});

	it("detects the exact object URL in legacy text bodies", () => {
		const body = `Check ${MEDIA.url} for details`;

		expect(postBodyReferencesMedia(body, MEDIA)).toBe(true);
	});

	it("ignores bodies that do not reference the asset", () => {
		expect(
			postBodyReferencesMedia(
				JSON.stringify({
					type: "doc",
					content: [
						{
							type: "paragraph",
							content: [{ text: "No media", type: "text" }],
						},
					],
				}),
				MEDIA,
			),
		).toBe(false);
		expect(postBodyReferencesMedia(null, MEDIA)).toBe(false);
		expect(postBodyReferencesMedia("plain text", MEDIA)).toBe(false);
	});

	it("matches a node that embeds the preview URL only", () => {
		const body = JSON.stringify({
			type: "doc",
			content: [
				{
					type: "mediaAsset",
					attrs: { kind: "image", mediaId: 99, src: MEDIA.previewUrl },
				},
			],
		});

		expect(postBodyReferencesMedia(body, MEDIA)).toBe(true);
	});
});

describe("collectMediaUsage", () => {
	const posts = [
		{
			body: bodyWithMediaAsset(),
			deletedAt: null,
			id: 1,
			status: "published",
			title: "Live post",
		},
		{
			body: JSON.stringify({
				type: "doc",
				content: [{ type: "paragraph" }],
			}),
			deletedAt: null,
			id: 2,
			status: "draft",
			title: "Other draft",
		},
		{
			body: `See ${MEDIA.url}`,
			deletedAt: new Date("2026-09-22"),
			id: 3,
			status: "draft",
			title: "Trashed draft",
		},
	];

	it("returns only referencing posts with status context", () => {
		expect(collectMediaUsage(posts, MEDIA)).toEqual([
			{
				postId: 1,
				status: "published",
				title: "Live post",
				trashed: false,
			},
			{
				postId: 3,
				status: "draft",
				title: "Trashed draft",
				trashed: true,
			},
		]);
	});
});

describe("isBlockingMediaUsage", () => {
	it("blocks live published and scheduled references", () => {
		expect(
			isBlockingMediaUsage({
				postId: 1,
				status: "published",
				title: "Live",
				trashed: false,
			}),
		).toBe(true);
		expect(
			isBlockingMediaUsage({
				postId: 2,
				status: "scheduled",
				title: "Soon",
				trashed: false,
			}),
		).toBe(true);
	});

	it("does not block drafts, archives, or trashed posts", () => {
		expect(
			isBlockingMediaUsage({
				postId: 3,
				status: "draft",
				title: "Draft",
				trashed: false,
			}),
		).toBe(false);
		expect(
			isBlockingMediaUsage({
				postId: 4,
				status: "archived",
				title: "Old",
				trashed: false,
			}),
		).toBe(false);
		expect(
			isBlockingMediaUsage({
				postId: 5,
				status: "published",
				title: "Trashed",
				trashed: true,
			}),
		).toBe(false);
	});
});
