import { THUMBNAIL_COLORS } from "./media.data";
import type { MediaFilter, MediaItem, MediaKind } from "./media.types";

export function formatMediaSize(sizeKb: number): string {
	if (sizeKb < 1024) {
		return `${sizeKb} KB`;
	}

	return `${(sizeKb / 1024).toFixed(1)} MB`;
}

export function filterMediaItems(
	items: MediaItem[],
	{ filter, query }: { filter: MediaFilter; query: string },
): MediaItem[] {
	const normalizedQuery = query.trim().toLowerCase();

	return items.filter((item) => {
		const matchesKind =
			filter === "all" ||
			(filter === "images" && item.kind === "image") ||
			(filter === "videos" && item.kind === "video");

		const matchesQuery =
			normalizedQuery.length === 0 ||
			item.name.toLowerCase().includes(normalizedQuery);

		return matchesKind && matchesQuery;
	});
}

export function getMediaItemColor(items: MediaItem[], item: MediaItem): string {
	const index = items.findIndex((entry) => entry.id === item.id);

	return THUMBNAIL_COLORS[index % THUMBNAIL_COLORS.length] ?? "#7c3aed";
}

interface MediaRow {
	createdAt: Date;
	dims: string;
	duration: string | null;
	id: number;
	name: string;
	previewUrl: string | null;
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

	if (row.previewUrl) {
		item.previewUrl = row.previewUrl;
	}

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
