import { desc, eq, sql } from "drizzle-orm";
import type { Db } from "#/db";
import {
	backupRestores,
	media,
	posts,
	settings,
	writingActivity,
} from "#/db/schema";
import {
	createMediaObjectKey,
	createMediaPreviewKey,
} from "#/features/media/functions/media-upload";
import { MAX_IMPORT_BYTES } from "./backup-export";
import {
	type ImportBundle,
	remapPostBody,
	validateBackup,
} from "./backup-import";

type Mode = "merge" | "replace";
type BatchStatement = Parameters<Db["batch"]>[0][number];

export function restoreObjectKey(
	userId: string,
	sessionId: string,
	index: number,
	kind: "original" | "preview",
): string {
	return `media/${userId}/restore-${sessionId}-${index}-${kind}`;
}

export interface ImportDependencies {
	db: Db;
	userId: string;
	publicUrl: string;
	putObject: (
		key: string,
		bytes: Uint8Array,
		contentType: string,
	) => Promise<void>;
	deleteObjects: (keys: string[]) => Promise<void>;
}

function errorResponse(message: string, status: number): Response {
	return Response.json(
		{ error: { code: "backup_import_failed", message } },
		{ status, headers: { "cache-control": "no-store" } },
	);
}

export async function readLimitedJson(request: Request): Promise<unknown> {
	const reader = request.body?.getReader();
	if (!reader) throw new Error("Select a backup file to import.");
	const decoder = new TextDecoder();
	let length = 0;
	let text = "";
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			length += value.byteLength;
			if (length > MAX_IMPORT_BYTES)
				throw new Error("Backup exceeds the 16 MiB import limit.");
			text += decoder.decode(value, { stream: true });
		}
		text += decoder.decode();
	} finally {
		releaseReader(reader);
	}
	try {
		return JSON.parse(text);
	} catch {
		throw new Error("Backup must be valid JSON.");
	}
}

function releaseReader(reader: ReadableStreamDefaultReader<Uint8Array>): void {
	reader.releaseLock();
}

function date(value: string | null): Date | null {
	return value === null ? null : new Date(value);
}

function uniqueSlug(slug: string, used: Set<string>): string {
	let candidate = slug;
	let suffix = 2;
	while (used.has(candidate)) {
		candidate = `${slug}-imported-${suffix}`;
		suffix += 1;
	}
	used.add(candidate);
	return candidate;
}

function bytesFromBase64(base64: string): Uint8Array {
	return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

export async function restoreBackup(
	bundle: ImportBundle,
	mode: Mode,
	{ db, userId, publicUrl, putObject, deleteObjects }: ImportDependencies,
	prepared?: {
		sessionId: string;
		keys: Array<{ key: string | null; previewKey: string | null }>;
	},
): Promise<{ posts: number; media: number; activity: number }> {
	const [existingPosts, existingMedia, existingSettings, lastPost, lastMedia] =
		await Promise.all([
			db
				.select({ id: posts.id, slug: posts.slug })
				.from(posts)
				.where(eq(posts.userId, userId))
				.orderBy(desc(posts.id)),
			db
				.select({
					id: media.id,
					fileKey: media.fileKey,
					previewKey: media.previewKey,
				})
				.from(media)
				.where(eq(media.userId, userId))
				.orderBy(desc(media.id)),
			db
				.select({ userId: settings.userId })
				.from(settings)
				.where(eq(settings.userId, userId))
				.get(),
			db
				.select({ id: posts.id })
				.from(posts)
				.orderBy(desc(posts.id))
				.limit(1)
				.get(),
			db
				.select({ id: media.id })
				.from(media)
				.orderBy(desc(media.id))
				.limit(1)
				.get(),
		]);
	const usedSlugs = new Set(
		mode === "merge" ? existingPosts.map((row) => row.slug) : [],
	);
	let nextPostId = (lastPost?.id ?? 0) + 1;
	let nextMediaId = (lastMedia?.id ?? 0) + 1;
	const postIds = new Map<number, number>();
	const postRows = bundle.posts.map((entry) => {
		const id = nextPostId++;
		if (entry.id !== undefined) postIds.set(entry.id, id);
		return { entry, id, slug: uniqueSlug(entry.slug, usedSlugs) };
	});
	const stagedKeys: string[] = [];
	const mediaMap = new Map<
		string,
		{
			id: number;
			url: string;
			previewUrl: string | null;
			oldPreviewUrl: string | null;
			oldId?: number;
		}
	>();
	const mediaRows = bundle.media.map((entry, index) => {
		const id = nextMediaId++;
		const key = prepared
			? (prepared.keys[index]?.key ?? null)
			: entry.fileKey
				? createMediaObjectKey({ userId, fileName: entry.name })
				: null;
		const previewKey = prepared
			? (prepared.keys[index]?.previewKey ?? null)
			: key && entry.previewKey && "contentBase64" in entry.preview
				? createMediaPreviewKey({
						userId,
						fileKey: key,
						contentType: entry.preview.contentType,
					})
				: null;
		const url = key ? `${publicUrl.replace(/\/$/, "")}/${key}` : entry.url;
		const previewUrl = previewKey
			? `${publicUrl.replace(/\/$/, "")}/${previewKey}`
			: null;
		mediaMap.set(entry.url, {
			id,
			url,
			previewUrl,
			oldPreviewUrl: entry.previewUrl,
			oldId: entry.id,
		});
		return { entry, id, key, previewKey, url, previewUrl };
	});
	try {
		for (const row of prepared ? [] : mediaRows) {
			if (row.key && "contentBase64" in row.entry.original) {
				stagedKeys.push(row.key);
				await putObject(
					row.key,
					bytesFromBase64(row.entry.original.contentBase64),
					row.entry.original.contentType,
				);
			}
			if (row.previewKey && "contentBase64" in row.entry.preview) {
				stagedKeys.push(row.previewKey);
				await putObject(
					row.previewKey,
					bytesFromBase64(row.entry.preview.contentBase64),
					row.entry.preview.contentType,
				);
			}
		}
		const statements: BatchStatement[] = [];
		if (prepared)
			statements.push(
				db
					.insert(backupRestores)
					.values({ id: prepared.sessionId, userId, createdAt: new Date() }),
			);
		if (mode === "replace") {
			statements.push(
				db.delete(writingActivity).where(eq(writingActivity.userId, userId)),
				db.delete(media).where(eq(media.userId, userId)),
				db.delete(posts).where(eq(posts.userId, userId)),
				db.delete(settings).where(eq(settings.userId, userId)),
			);
		}
		if (bundle.settings && (mode === "replace" || !existingSettings)) {
			const { updatedAt, ...fields } = bundle.settings;
			statements.push(
				db.insert(settings).values({
					...fields,
					userId,
					updatedAt: updatedAt ? new Date(updatedAt) : new Date(),
				}),
			);
		}
		for (const row of postRows) {
			const { entry } = row;
			statements.push(
				db.insert(posts).values({
					id: row.id,
					userId,
					title: entry.title,
					slug: row.slug,
					seoTitle: entry.seoTitle,
					status: entry.status,
					body: remapPostBody(entry.body, mediaMap),
					description: entry.description,
					publishedAt: date(entry.publishedAt),
					scheduledAt: date(entry.scheduledAt),
					wordCount: entry.wordCount,
					revision: entry.revision,
					deletedAt: date(entry.deletedAt),
					createdAt: new Date(entry.createdAt),
					updatedAt: new Date(entry.updatedAt),
				}),
			);
		}
		for (const row of mediaRows) {
			const { entry } = row;
			statements.push(
				db.insert(media).values({
					id: row.id,
					userId,
					postId: entry.postId ? (postIds.get(entry.postId) ?? null) : null,
					name: entry.name,
					type: entry.type,
					size: entry.size,
					dims: entry.dims,
					duration: entry.duration,
					fileKey: row.key,
					url: row.url,
					previewKey: row.previewKey,
					previewUrl: row.previewUrl,
					previewType: row.previewKey ? entry.previewType : null,
					previewSize: row.previewKey ? entry.previewSize : null,
					status: entry.status,
					deletedAt: date(entry.deletedAt),
					createdAt: new Date(entry.createdAt),
				}),
			);
		}
		for (const day of bundle.activity) {
			statements.push(
				db
					.insert(writingActivity)
					.values({ userId, ...day })
					.onConflictDoUpdate({
						target: [writingActivity.userId, writingActivity.activityDate],
						set: {
							wordsAdded:
								mode === "merge"
									? sql`max(${writingActivity.wordsAdded}, ${day.wordsAdded})`
									: day.wordsAdded,
						},
					}),
			);
		}
		const [first, ...rest] = statements;
		if (first) await db.batch([first, ...rest]);
	} catch (error) {
		const committed = prepared
			? await db
					.select({ id: backupRestores.id })
					.from(backupRestores)
					.where(eq(backupRestores.id, prepared.sessionId))
					.get()
			: null;
		const cleanupKeys = prepared
			? prepared.keys.flatMap((row) =>
					[row.key, row.previewKey].filter(
						(key): key is string => key !== null,
					),
				)
			: stagedKeys;
		if (!committed && cleanupKeys.length) {
			try {
				await deleteObjects(cleanupKeys);
			} catch (cleanupError) {
				console.error("Backup staging cleanup failed", cleanupError);
			}
		}
		throw error;
	}
	if (mode === "replace") {
		const oldKeys = existingMedia.flatMap((row) =>
			[row.fileKey, row.previewKey].filter(
				(key): key is string => key !== null,
			),
		);
		if (oldKeys.length) {
			try {
				await deleteObjects(oldKeys);
			} catch (cleanupError) {
				console.error("Old backup objects cleanup failed", cleanupError);
			}
		}
	}
	return {
		posts: postRows.length,
		media: mediaRows.length,
		activity: bundle.activity.length,
	};
}

export async function handleImportRequest(
	request: Request,
	deps: ImportDependencies,
): Promise<Response> {
	const origin = request.headers.get("origin");
	if (
		origin !== new URL(request.url).origin ||
		request.headers.get("content-type")?.split(";")[0] !== "application/json"
	) {
		return errorResponse("Use a same-origin JSON import request.", 403);
	}
	const mode = new URL(request.url).searchParams.get("mode");
	if (mode !== "merge" && mode !== "replace")
		return errorResponse("Choose merge or replace.", 400);
	if (
		mode === "replace" &&
		request.headers.get("x-confirm-replace") !== "REPLACE"
	) {
		return errorResponse(
			"Confirm replacement before deleting existing content.",
			400,
		);
	}
	if (Number(request.headers.get("content-length")) > MAX_IMPORT_BYTES)
		return errorResponse("Backup exceeds the 16 MiB import limit.", 413);
	try {
		const bundle = validateBackup(await readLimitedJson(request));
		if (
			bundle.media.some((entry) => entry.fileKey) &&
			!/^https:\/\//.test(deps.publicUrl)
		) {
			return errorResponse(
				"Configure the R2 public URL before restoring media.",
				503,
			);
		}
		const result = await restoreBackup(bundle, mode, deps);
		return Response.json(result, { headers: { "cache-control": "no-store" } });
	} catch (error) {
		if (
			error instanceof Error &&
			/^Backup |^Invalid or unsupported|^Select a backup/.test(error.message)
		) {
			return errorResponse(
				error.message,
				error.message.includes("limit") ? 413 : 422,
			);
		}
		console.error("Backup restore failed", error);
		return errorResponse("Restore failed; existing data was left intact.", 500);
	}
}
