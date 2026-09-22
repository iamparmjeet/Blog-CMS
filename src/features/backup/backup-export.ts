export const BACKUP_VERSION = 1;

export interface BackupPost {
	title: string;
	slug: string;
	seoTitle: string;
	status: string;
	body: string | null;
	description: string;
	publishedAt: string | null;
	scheduledAt: string | null;
	wordCount: number;
	revision: number;
	deletedAt: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface BackupStoredObject {
	contentType: string;
	contentBase64: string;
}

export interface BackupMediaEntry {
	name: string;
	type: string;
	size: string;
	dims: string;
	duration: string | null;
	fileKey: string | null;
	url: string;
	previewKey: string | null;
	previewUrl: string | null;
	previewType: string | null;
	previewSize: string | null;
	status: string;
	deletedAt: string | null;
	createdAt: string;
	original: BackupStoredObject | { missing: true };
	preview: BackupStoredObject | { missing: true };
}

export interface BackupActivityDay {
	activityDate: string;
	wordsAdded: number;
}

export interface BackupBundle {
	version: number;
	exportedAt: string;
	posts: BackupPost[];
	settings: Record<string, unknown> | null;
	media: BackupMediaEntry[];
	activity: BackupActivityDay[];
}

export interface BackupPostInput {
	title: string;
	slug: string;
	seoTitle: string;
	status: string;
	body: string | null;
	description: string;
	publishedAt: Date | number | null;
	scheduledAt: Date | number | null;
	wordCount: number;
	revision: number;
	deletedAt: Date | number | null;
	createdAt: Date | number;
	updatedAt: Date | number;
}

export interface BackupObjectInput {
	contentType: string;
	bytes: Uint8Array;
}

export interface BackupMediaInput {
	row: {
		name: string;
		type: string;
		size: string;
		dims: string;
		duration: string | null;
		fileKey: string | null;
		url: string;
		previewKey: string | null;
		previewUrl: string | null;
		previewType: string | null;
		previewSize: string | null;
		status: string;
		deletedAt: Date | number | null;
		createdAt: Date | number;
	};
	original: BackupObjectInput | null;
	preview: BackupObjectInput | null;
}

function toIso(value: Date | number | null): string | null {
	if (value === null) return null;
	return value instanceof Date
		? value.toISOString()
		: new Date(value).toISOString();
}

function toIsoRequired(value: Date | number): string {
	return value instanceof Date
		? value.toISOString()
		: new Date(value).toISOString();
}

function encodeObject(
	input: BackupObjectInput | null,
): BackupStoredObject | { missing: true } {
	if (!input) return { missing: true };

	let binary = "";
	const bytes = input.bytes;

	for (let i = 0; i < bytes.length; i += 1) {
		binary += String.fromCharCode(bytes[i] as number);
	}

	return {
		contentType: input.contentType,
		contentBase64: btoa(binary),
	};
}

export interface BuildBackupBundleInput {
	exportedAt: string;
	posts: BackupPostInput[];
	settings: Record<string, unknown> | null;
	media: BackupMediaInput[];
	activity: BackupActivityDay[];
}

export function buildBackupBundle(input: BuildBackupBundleInput): BackupBundle {
	return {
		version: BACKUP_VERSION,
		exportedAt: input.exportedAt,
		posts: input.posts.map((post) => ({
			title: post.title,
			slug: post.slug,
			seoTitle: post.seoTitle,
			status: post.status,
			body: post.body,
			description: post.description,
			publishedAt: toIso(post.publishedAt),
			scheduledAt: toIso(post.scheduledAt),
			wordCount: post.wordCount,
			revision: post.revision,
			deletedAt: toIso(post.deletedAt),
			createdAt: toIsoRequired(post.createdAt),
			updatedAt: toIsoRequired(post.updatedAt),
		})),
		settings: input.settings,
		media: input.media.map((entry) => ({
			name: entry.row.name,
			type: entry.row.type,
			size: entry.row.size,
			dims: entry.row.dims,
			duration: entry.row.duration,
			fileKey: entry.row.fileKey,
			url: entry.row.url,
			previewKey: entry.row.previewKey,
			previewUrl: entry.row.previewUrl,
			previewType: entry.row.previewType,
			previewSize: entry.row.previewSize,
			status: entry.row.status,
			deletedAt: toIso(entry.row.deletedAt),
			createdAt: toIsoRequired(entry.row.createdAt),
			original: encodeObject(entry.original),
			preview: encodeObject(entry.preview),
		})),
		activity: input.activity.map((day) => ({
			activityDate: day.activityDate,
			wordsAdded: day.wordsAdded,
		})),
	};
}
