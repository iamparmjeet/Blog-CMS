import { z } from "zod";
import { BACKUP_VERSION } from "./backup-export";

const instant = z.iso.datetime({ offset: true });
const optionalInstant = instant.nullable();
const storedObject = z.union([
	z.object({ missing: z.literal(true) }),
	z.object({
		contentType: z.enum([
			"image/gif",
			"image/jpeg",
			"image/png",
			"image/webp",
			"video/mp4",
			"video/webm",
		]),
		contentBase64: z
			.string()
			.regex(
				/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/,
			),
	}),
]);
const previewObject = z.union([
	z.object({ missing: z.literal(true) }),
	z.object({
		contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
		contentBase64: z
			.string()
			.regex(
				/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/,
			),
	}),
]);

const post = z.object({
	id: z.number().int().positive().optional(),
	title: z.string(),
	slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
	seoTitle: z.string(),
	status: z.enum(["draft", "published", "scheduled", "archived"]),
	body: z.string().nullable(),
	description: z.string(),
	publishedAt: optionalInstant,
	scheduledAt: optionalInstant,
	wordCount: z.number().int().nonnegative(),
	revision: z.number().int().nonnegative(),
	deletedAt: optionalInstant,
	createdAt: instant,
	updatedAt: instant,
});

const media = z.object({
	id: z.number().int().positive().optional(),
	postId: z.number().int().positive().nullable().optional(),
	name: z.string().min(1),
	type: z.enum([
		"image/gif",
		"image/jpeg",
		"image/png",
		"image/webp",
		"video/mp4",
		"video/webm",
	]),
	size: z.string(),
	dims: z.string(),
	duration: z.string().nullable(),
	fileKey: z.string().nullable(),
	url: z.string(),
	previewKey: z.string().nullable(),
	previewUrl: z.string().nullable(),
	previewType: z.string().nullable(),
	previewSize: z.string().nullable(),
	status: z.enum(["pending", "ready"]),
	deletedAt: optionalInstant,
	createdAt: instant,
	original: storedObject,
	preview: previewObject,
});

// The source owner's identity and storage configuration never cross instances.
export const backupSettings = z.object({
	displayName: z.string().nullable().optional(),
	blogTitle: z.string().nullable().optional(),
	domain: z.string().nullable().optional(),
	bio: z.string().nullable().optional(),
	accentColor: z.string().optional(),
	themeMode: z.enum(["system", "day", "night"]).optional(),
	surfaceTint: z.string().nullable().optional(),
	defaultModel: z.string().min(1).optional(),
	seoMeta: z.boolean().optional(),
	rssFeed: z.boolean().optional(),
	timeZone: z.string().optional(),
	readingTime: z.boolean().optional(),
	allowedOrigins: z.string().nullable().optional(),
	umamiShareUrl: z.string().nullable().optional(),
	writingStyle: z.string().nullable().optional(),
	writingSample: z.string().nullable().optional(),
	updatedAt: instant.optional(),
});

export const backupImportSchema = z.object({
	version: z.literal(BACKUP_VERSION),
	exportedAt: instant,
	posts: z.array(post).max(300),
	settings: backupSettings.nullable(),
	media: z.array(media).max(300),
	activity: z
		.array(
			z.object({
				activityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
				wordsAdded: z.number().int().nonnegative(),
			}),
		)
		.max(3660),
});

const objectDescriptor = z.union([
	z.object({ missing: z.literal(true) }),
	z.object({
		contentType: storedObject.options[1].shape.contentType,
		byteLength: z
			.number()
			.int()
			.nonnegative()
			.max(50 * 1024 * 1024),
	}),
]);
const previewDescriptor = z.union([
	z.object({ missing: z.literal(true) }),
	z.object({
		contentType: previewObject.options[1].shape.contentType,
		byteLength: z
			.number()
			.int()
			.nonnegative()
			.max(50 * 1024 * 1024),
	}),
]);
export const backupManifestSchema = backupImportSchema.extend({
	media: z
		.array(
			media.extend({ original: objectDescriptor, preview: previewDescriptor }),
		)
		.max(300),
});
export type ImportManifest = z.infer<typeof backupManifestSchema>;

export type ImportBundle = z.infer<typeof backupImportSchema>;

export function validateBackup(value: unknown): ImportBundle {
	const result = backupImportSchema.safeParse(value);
	if (!result.success)
		throw new Error("Invalid or unsupported ContentOS backup.");
	const bundle = result.data;
	validateRows(bundle);
	for (const entry of bundle.media) {
		if (
			"contentBase64" in entry.original &&
			(entry.original.contentType !== entry.type ||
				atob(entry.original.contentBase64).length !== Number(entry.size))
		) {
			throw new Error(
				`Backup contains inconsistent media bytes for ${entry.name}.`,
			);
		}
		for (const object of [entry.original, entry.preview]) {
			if (
				"contentBase64" in object &&
				btoa(atob(object.contentBase64)) !== object.contentBase64
			)
				throw new Error(
					`Backup contains invalid media bytes for ${entry.name}.`,
				);
		}
	}
	return bundle;
}

function validateRows(bundle: {
	posts: ImportBundle["posts"];
	media: Array<{
		id?: number;
		url: string;
		postId?: number | null;
		fileKey: string | null;
		name: string;
		original:
			| ImportBundle["media"][number]["original"]
			| ImportManifest["media"][number]["original"];
	}>;
	activity: ImportBundle["activity"];
}): void {
	const unique = (values: Array<string | number>) =>
		new Set(values).size === values.length;
	if (
		!unique(bundle.posts.map((entry) => entry.slug)) ||
		!unique(
			bundle.posts.flatMap((entry) =>
				entry.id === undefined ? [] : [entry.id],
			),
		) ||
		!unique(
			bundle.media.flatMap((entry) =>
				entry.id === undefined ? [] : [entry.id],
			),
		) ||
		!unique(bundle.media.map((entry) => entry.url)) ||
		!unique(bundle.activity.map((entry) => entry.activityDate))
	)
		throw new Error(
			"Backup contains duplicate posts, media, or activity days.",
		);
	const postIds = new Set(bundle.posts.map((entry) => entry.id));
	for (const entry of bundle.media) {
		if (entry.postId && !postIds.has(entry.postId)) {
			throw new Error("Backup media refers to an unknown post.");
		}
		if (entry.fileKey && "missing" in entry.original) {
			throw new Error(
				`Backup is missing the original object for ${entry.name}.`,
			);
		}
	}
}

export function validateBackupManifest(value: unknown): ImportManifest {
	const result = backupManifestSchema.safeParse(value);
	if (!result.success)
		throw new Error("Invalid or unsupported ContentOS backup manifest.");
	const bundle = result.data;
	validateRows(bundle);
	for (const entry of bundle.media) {
		if (
			entry.fileKey &&
			("missing" in entry.original ||
				entry.original.contentType !== entry.type ||
				entry.original.byteLength !== Number(entry.size))
		) {
			throw new Error(
				`Backup contains inconsistent media bytes for ${entry.name}.`,
			);
		}
		if (
			"byteLength" in entry.preview &&
			entry.previewSize !== null &&
			entry.preview.byteLength !== Number(entry.previewSize)
		) {
			throw new Error(
				`Backup contains inconsistent preview bytes for ${entry.name}.`,
			);
		}
	}
	return bundle;
}

export function remapPostBody(
	body: string | null,
	mediaMap: Map<
		string,
		{
			id: number;
			url: string;
			previewUrl: string | null;
			oldPreviewUrl: string | null;
			oldId?: number;
		}
	>,
): string | null {
	if (!body) return body;
	let document: unknown;
	try {
		document = JSON.parse(body);
	} catch {
		// Older plain-text bodies can contain full media URLs.
		let text = body;
		for (const [oldUrl, entry] of mediaMap) {
			text = text.replaceAll(oldUrl, entry.url);
			if (entry.oldPreviewUrl && entry.previewUrl)
				text = text.replaceAll(entry.oldPreviewUrl, entry.previewUrl);
		}
		return text;
	}
	function visit(value: unknown): unknown {
		if (Array.isArray(value)) return value.map(visit);
		if (!value || typeof value !== "object") return value;
		const record = value as Record<string, unknown>;
		const mapped: Record<string, unknown> = {};
		for (const [key, item] of Object.entries(record)) mapped[key] = visit(item);
		if (record.attrs && typeof record.attrs === "object") {
			const originalAttrs = record.attrs as Record<string, unknown>;
			const attrs = mapped.attrs as Record<string, unknown>;
			const match =
				mediaMap.get(String(originalAttrs.src)) ??
				[...mediaMap.values()].find(
					(entry) =>
						entry.oldId !== undefined && entry.oldId === originalAttrs.mediaId,
				);
			if (match) {
				attrs.mediaId = match.id;
				if (
					originalAttrs.src === undefined ||
					mediaMap.has(String(originalAttrs.src))
				)
					attrs.src = match.url;
				if (match.oldPreviewUrl && originalAttrs.poster === match.oldPreviewUrl)
					attrs.poster = match.previewUrl;
			}
		}
		for (const [oldUrl, entry] of mediaMap) {
			if (mapped.src === oldUrl) mapped.src = entry.url;
			if (entry.oldPreviewUrl && mapped.src === entry.oldPreviewUrl)
				mapped.src = entry.previewUrl;
		}
		return mapped;
	}
	return JSON.stringify(visit(document));
}
