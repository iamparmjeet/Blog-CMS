import { describe, expect, it } from "vitest";
import { MAX_MEDIA_SIZE_BYTES } from "#/constants/media.constants";
import {
	createMediaObjectKey,
	createMediaPreviewKey,
	createMediaPublicUrl,
	formatMediaDims,
	formatMediaDuration,
	sanitizeMediaFileName,
	validateMediaPreview,
	validateMediaUpload,
} from "./media-upload";

describe("validateMediaUpload", () => {
	it.each([
		"image/gif",
		"image/jpeg",
		"image/png",
		"image/webp",
		"video/mp4",
		"video/webm",
	])("accepts %s", (contentType) => {
		expect(
			validateMediaUpload({
				contentType,
				fileName: "asset.bin",
				sizeBytes: 1_024,
			}),
		).toEqual({
			contentType,
			fileName: "asset.bin",
			sizeBytes: 1_024,
		});
	});

	it("rejects unsupported MIME types", () => {
		expect(() =>
			validateMediaUpload({
				contentType: "application/pdf",
				fileName: "post.pdf",
				sizeBytes: 1_024,
			}),
		).toThrow("Unsupported file type");
	});

	it("rejects empty files", () => {
		expect(() =>
			validateMediaUpload({
				contentType: "image/png",
				fileName: "empty.png",
				sizeBytes: 0,
			}),
		).toThrow("Select a non-empty file to upload");
	});

	it("rejects files larger than 50 MB", () => {
		expect(() =>
			validateMediaUpload({
				contentType: "image/png",
				fileName: "large.png",
				sizeBytes: MAX_MEDIA_SIZE_BYTES + 1,
			}),
		).toThrow("Files must be 50 MB or smaller");
	});
});

describe("sanitizeMediaFileName", () => {
	it("removes client-supplied path components", () => {
		expect(sanitizeMediaFileName("../../photos/launch.png")).toBe("launch.png");
	});

	it("normalizes unsafe filename characters", () => {
		expect(sanitizeMediaFileName("Summer photo (final).PNG")).toBe(
			"Summer-photo-final.png",
		);
	});

	it("provides a safe fallback name", () => {
		expect(sanitizeMediaFileName("💫")).toBe("upload");
	});
});

describe("createMediaObjectKey", () => {
	it("creates an immutable owner-scoped key", () => {
		expect(
			createMediaObjectKey({
				fileName: "Hero image.png",
				objectId: "upload-id",
				userId: "owner-1",
			}),
		).toBe("media/owner-1/upload-id-Hero-image.png");
	});
});

describe("validateMediaPreview", () => {
	it("accepts supported preview types within the size cap", () => {
		expect(
			validateMediaPreview({ contentType: "image/webp", sizeBytes: 42_000 }),
		).toEqual({ contentType: "image/webp", sizeBytes: 42_000 });
	});

	it("returns null when no preview is declared", () => {
		expect(validateMediaPreview(undefined)).toBeNull();
	});

	it("rejects unsupported preview types", () => {
		expect(() =>
			validateMediaPreview({ contentType: "image/gif", sizeBytes: 1_000 }),
		).toThrow("Unsupported preview type");
	});

	it("rejects empty preview payloads", () => {
		expect(() =>
			validateMediaPreview({ contentType: "image/jpeg", sizeBytes: 0 }),
		).toThrow("Select a non-empty file to upload");
	});
});

describe("createMediaPreviewKey", () => {
	it("derives a typed key beside the original object", () => {
		expect(
			createMediaPreviewKey({
				contentType: "image/webp",
				fileKey: "media/owner-1/upload-id-hero.png",
				userId: "owner-1",
			}),
		).toBe("media/owner-1/upload-id-hero.png.preview.webp");

		expect(
			createMediaPreviewKey({
				contentType: "image/jpeg",
				fileKey: "media/owner-1/upload-id-clip.mp4",
				userId: "owner-1",
			}),
		).toBe("media/owner-1/upload-id-clip.mp4.preview.jpg");
	});

	it("rejects keys outside the owner's prefix", () => {
		expect(() =>
			createMediaPreviewKey({
				contentType: "image/webp",
				fileKey: "media/owner-2/upload-id-hero.png",
				userId: "owner-1",
			}),
		).toThrow("Preview variants must stay owner-scoped");
	});
});

describe("formatMediaDims", () => {
	it("formats stored dimensions", () => {
		expect(formatMediaDims(1280, 720)).toBe("1280×720");
	});

	it("returns an empty string for unknown dimensions", () => {
		expect(formatMediaDims(undefined, undefined)).toBe("");
		expect(formatMediaDims(0, 100)).toBe("");
	});
});

describe("formatMediaDuration", () => {
	it("formats seconds as minutes and seconds", () => {
		expect(formatMediaDuration(29)).toBe("0:29");
		expect(formatMediaDuration(95)).toBe("1:35");
	});

	it("returns an empty string for unknown durations", () => {
		expect(formatMediaDuration(undefined)).toBe("");
		expect(formatMediaDuration(0)).toBe("");
	});
});

describe("createMediaPublicUrl", () => {
	it("places the object below the configured public URL", () => {
		expect(
			createMediaPublicUrl({
				fileKey: "media/owner-1/upload-id-image.png",
				publicUrl: "https://media.example.com/assets/",
			}),
		).toBe(
			"https://media.example.com/assets/media/owner-1/upload-id-image.png",
		);
	});

	it("rejects non-HTTP public URLs", () => {
		expect(() =>
			createMediaPublicUrl({
				fileKey: "media/owner-1/upload-id-image.png",
				publicUrl: "file:///tmp/media",
			}),
		).toThrow("R2 public URL must use HTTP or HTTPS");
	});
});
