import { asc, eq } from "drizzle-orm";
import type { Db } from "#/db";
import { media, posts, settings, writingActivity } from "#/db/schema";
import {
	type BackupMediaInput,
	type BackupObjectInput,
	buildBackupBundle,
} from "./backup-export";

export type BackupObjectReader = (
	key: string,
) => Promise<BackupObjectInput | null>;

export interface CollectedBackupData {
	posts: Array<{
		id: number;
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
	}>;
	settings: Record<string, unknown> | null;
	media: BackupMediaInput[];
	activity: Array<{ activityDate: string; wordsAdded: number }>;
}

export async function collectBackupData(
	db: Db,
	userId: string,
): Promise<CollectedBackupData> {
	const [postRows, settingsRow, mediaRows, activityRows] = await Promise.all([
		db
			.select({
				id: posts.id,
				title: posts.title,
				slug: posts.slug,
				seoTitle: posts.seoTitle,
				status: posts.status,
				body: posts.body,
				description: posts.description,
				publishedAt: posts.publishedAt,
				scheduledAt: posts.scheduledAt,
				wordCount: posts.wordCount,
				revision: posts.revision,
				deletedAt: posts.deletedAt,
				createdAt: posts.createdAt,
				updatedAt: posts.updatedAt,
			})
			.from(posts)
			.where(eq(posts.userId, userId))
			.orderBy(asc(posts.id)),
		db.select().from(settings).where(eq(settings.userId, userId)).get(),
		db
			.select({
				id: media.id,
				postId: media.postId,
				name: media.name,
				type: media.type,
				size: media.size,
				dims: media.dims,
				duration: media.duration,
				fileKey: media.fileKey,
				url: media.url,
				previewKey: media.previewKey,
				previewUrl: media.previewUrl,
				previewType: media.previewType,
				previewSize: media.previewSize,
				status: media.status,
				deletedAt: media.deletedAt,
				createdAt: media.createdAt,
			})
			.from(media)
			.where(eq(media.userId, userId))
			.orderBy(asc(media.id)),
		db
			.select({
				activityDate: writingActivity.activityDate,
				wordsAdded: writingActivity.wordsAdded,
			})
			.from(writingActivity)
			.where(eq(writingActivity.userId, userId))
			.orderBy(asc(writingActivity.activityDate)),
	]);

	let settingsData: Record<string, unknown> | null = null;

	if (settingsRow) {
		const { userId: _owner, ...rest } = settingsRow;
		settingsData = rest;
	}

	return {
		posts: postRows,
		settings: settingsData,
		media: mediaRows.map((row) => ({ row, original: null, preview: null })),
		activity: activityRows,
	};
}

export interface HandleExportRequestDeps {
	db: Db;
	userId: string;
	readObject: BackupObjectReader;
	now?: Date;
}

async function readStoredObject(
	readObject: BackupObjectReader,
	key: string | null,
): Promise<BackupObjectInput | null> {
	if (!key) return null;

	try {
		return await readObject(key);
	} catch {
		return null;
	}
}

export async function handleExportRequest({
	db,
	userId,
	readObject,
	now = new Date(),
}: HandleExportRequestDeps): Promise<Response> {
	const data = await collectBackupData(db, userId);

	const mediaEntries = await Promise.all(
		data.media.map(async (entry) => ({
			row: entry.row,
			original: await readStoredObject(readObject, entry.row.fileKey),
			preview: await readStoredObject(readObject, entry.row.previewKey),
		})),
	);

	const bundle = buildBackupBundle({
		exportedAt: now.toISOString(),
		posts: data.posts,
		settings: data.settings,
		media: mediaEntries,
		activity: data.activity,
	});

	const dateStamp = now.toISOString().slice(0, 10).replaceAll("-", "");

	return new Response(JSON.stringify(bundle), {
		status: 200,
		headers: {
			"content-type": "application/json",
			"cache-control": "private, no-store",
			"content-disposition": `attachment; filename="contentos-backup-${dateStamp}.json"`,
		},
	});
}
