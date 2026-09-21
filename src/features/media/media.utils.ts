import type { MediaItem, MediaKind } from "./media.types";

export function formatMediaSize(sizeKb: number): string {
	if (sizeKb < 1024) {
		return `${sizeKb} KB`;
	}

	return `${(sizeKb / 1024).toFixed(1)} MB`;
}

interface MediaRow {
	createdAt: Date;
	dims: string;
	duration: string | null;
	id: number;
	name: string;
	size: string;
	type: string;
	url: string;
}

export function toMediaItem(row: MediaRow): MediaItem {
	const sizeBytes = Number(row.size);

	if (!Number.isFinite(sizeBytes) || sizeBytes < 0) {
		throw new Error("Media has an invalid stored size");
	}

	const kind = getMediaKind(row.type);
	const item: MediaItem = {
		dims: row.dims,
		id: row.id,
		kind,
		name: row.name,
		sizeKb: Math.ceil(sizeBytes / 1024),
		uploadedAt: row.createdAt.toISOString(),
		url: row.url,
	};

	if (row.duration) {
		item.duration = row.duration;
	}

	return item;
}

function getMediaKind(contentType: string): MediaKind {
	if (contentType.startsWith("image/")) return "image";
	if (contentType.startsWith("video/")) return "video";

	throw new Error("Media has an unsupported stored type");
}
