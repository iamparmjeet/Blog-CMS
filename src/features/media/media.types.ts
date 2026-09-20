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
