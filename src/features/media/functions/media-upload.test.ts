import { describe, expect, it } from "vitest";
import { MAX_MEDIA_SIZE_BYTES } from "#/constants/media.constants";
import {
	createMediaObjectKey,
	createMediaPublicUrl,
	sanitizeMediaFileName,
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
