export const BLOCKING_MEDIA_USAGE_STATUSES = [
	"published",
	"scheduled",
] as const;

export interface MediaUsageReference {
	postId: number;
	status: string;
	title: string;
	trashed: boolean;
}

export interface MediaReferenceTarget {
	id: number;
	previewUrl?: string | null;
	url: string;
}

interface PostBodyRow {
	body: string | null;
	deletedAt: Date | null;
	id: number;
	status: string;
	title: string;
}

export function isBlockingMediaUsage(reference: MediaUsageReference): boolean {
	return (
		!reference.trashed &&
		BLOCKING_MEDIA_USAGE_STATUSES.some((status) => status === reference.status)
	);
}

// A published post must never lose its embedded media silently: scan every
// owner post body (TipTap JSON or legacy text) for references to the asset
// by media id, exact object URL, or preview URL.
export function collectMediaUsage(
	posts: PostBodyRow[],
	media: MediaReferenceTarget,
): MediaUsageReference[] {
	return posts
		.filter((post) => postBodyReferencesMedia(post.body, media))
		.map((post) => ({
			postId: post.id,
			status: post.status,
			title: post.title,
			trashed: post.deletedAt !== null,
		}));
}

export function postBodyReferencesMedia(
	body: string | null,
	media: MediaReferenceTarget,
): boolean {
	if (!body) {
		return false;
	}

	if (media.url && body.includes(media.url)) {
		return true;
	}

	if (media.previewUrl && body.includes(media.previewUrl)) {
		return true;
	}

	try {
		return nodeReferencesMedia(JSON.parse(body), media);
	} catch {
		return false;
	}
}

function nodeReferencesMedia(
	value: unknown,
	media: MediaReferenceTarget,
): boolean {
	if (Array.isArray(value)) {
		return value.some((entry) => nodeReferencesMedia(entry, media));
	}

	if (typeof value !== "object" || value === null) {
		return false;
	}

	const record = value as Record<string, unknown>;
	const attrs = record.attrs;

	if (attrs && typeof attrs === "object") {
		const attrRecord = attrs as Record<string, unknown>;

		if (attrRecord.mediaId === media.id) {
			return true;
		}

		if (
			typeof attrRecord.src === "string" &&
			(attrRecord.src === media.url ||
				(Boolean(media.previewUrl) && attrRecord.src === media.previewUrl))
		) {
			return true;
		}
	}

	if (typeof record.src === "string" && record.src === media.url) {
		return true;
	}

	return nodeReferencesMedia(record.content, media);
}
