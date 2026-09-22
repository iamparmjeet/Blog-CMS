import { describe, expect, it } from "vitest";
import type { MediaItem } from "./media.types";
import { filterMediaItems, formatMediaSize, toMediaItem } from "./media.utils";

function makeItem(overrides: Partial<MediaItem> = {}): MediaItem {
	return {
		dims: "1200×630",
		id: 1,
		kind: "image",
		name: "hero.png",
		sizeKb: 200,
		uploadedAt: "2026-09-22T00:00:00.000Z",
		url: "https://media.example.com/media/owner-1/hero.png",
		...overrides,
	};
}

describe("filterMediaItems", () => {
	const items = [
		makeItem({ id: 1, kind: "image", name: "Hero Shot.png" }),
		makeItem({ id: 2, kind: "video", name: "demo-reel.mp4" }),
		makeItem({ id: 3, kind: "image", name: "workflow.png" }),
	];

	it("filters by kind", () => {
		expect(
			filterMediaItems(items, { filter: "videos", query: "" }).map(
				(item) => item.id,
			),
		).toEqual([2]);
	});

	it("searches file names case-insensitively", () => {
		expect(
			filterMediaItems(items, { filter: "all", query: "HERO" }).map(
				(item) => item.id,
			),
		).toEqual([1]);
	});

	it("combines kind and query filters", () => {
		expect(
			filterMediaItems(items, { filter: "images", query: "workflow" }).map(
				(item) => item.id,
			),
		).toEqual([3]);
	});

	it("returns everything for an empty query on the all filter", () => {
		expect(
			filterMediaItems(items, { filter: "all", query: "   " }),
		).toHaveLength(3);
	});
});

describe("toMediaItem", () => {
	it("exposes the optimized preview URL when present", () => {
		const item = toMediaItem({
			createdAt: new Date("2026-09-22T00:00:00.000Z"),
			dims: "1200×630",
			duration: null,
			id: 7,
			name: "hero.png",
			previewUrl:
				"https://media.example.com/media/owner-1/hero.png.preview.webp",
			size: "2048",
			type: "image/png",
			url: "https://media.example.com/media/owner-1/hero.png",
		});

		expect(item.previewUrl).toBe(
			"https://media.example.com/media/owner-1/hero.png.preview.webp",
		);
	});

	it("omits previewUrl for legacy media without a variant", () => {
		const item = toMediaItem({
			createdAt: new Date("2026-09-22T00:00:00.000Z"),
			dims: "",
			duration: "0:29",
			id: 8,
			name: "clip.mp4",
			previewUrl: null,
			size: "2048",
			type: "video/mp4",
			url: "https://media.example.com/media/owner-1/clip.mp4",
		});

		expect(item).not.toHaveProperty("previewUrl");
		expect(item.duration).toBe("0:29");
	});
});

describe("formatMediaSize", () => {
	it("formats kilobytes and megabytes", () => {
		expect(formatMediaSize(512)).toBe("512 KB");
		expect(formatMediaSize(2048)).toBe("2.0 MB");
	});
});
