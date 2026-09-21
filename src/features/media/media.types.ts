export type MediaKind = "image" | "video";

export type MediaFilter = "all" | "images" | "videos";

export interface MediaItem {
	dims: string;
	duration?: string;
	id: number;
	kind: MediaKind;
	name: string;
	sizeKb: number;
	uploadedAt: string;
	url: string;
}

export const MEDIA_CONTENT_TYPES = [
	"image/gif",
	"image/jpeg",
	"image/png",
	"image/webp",
	"video/mp4",
	"video/webm",
] as const;

export type AllowedMediaContentType = (typeof MEDIA_CONTENT_TYPES)[number];

export interface MediaUploadInput {
	contentType: string;
	fileName: string;
	sizeBytes: number;
}

export interface ValidatedMediaUpload {
	contentType: AllowedMediaContentType;
	fileName: string;
	sizeBytes: number;
}
