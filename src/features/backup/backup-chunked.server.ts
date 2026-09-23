import { eq } from "drizzle-orm";
import { backupRestores } from "#/db/schema";
import { MEDIA_CONTENT_TYPES } from "#/features/media/media.types";
import { MAX_IMPORT_BYTES } from "./backup-export";
import { validateBackupManifest } from "./backup-import";
import {
	type ImportDependencies,
	readLimitedJson,
	restoreBackup,
	restoreObjectKey,
} from "./backup-import.server";

const SESSION =
	/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_OBJECT_BYTES = 50 * 1024 * 1024;

export interface ChunkedDependencies extends ImportDependencies {
	listStagedKeys: (prefix: string) => Promise<string[]>;
	writeStream: (
		key: string,
		stream: ReadableStream<Uint8Array>,
		contentType: string,
	) => Promise<void>;
	headObject: (
		key: string,
	) => Promise<{ size: number; contentType: string | null } | null>;
}

export async function handleChunkedCancel(
	request: Request,
	deps: ChunkedDependencies,
): Promise<Response> {
	if (request.headers.get("origin") !== new URL(request.url).origin)
		return fail("Use a same-origin restore request.", 403);
	const sessionId = new URL(request.url).searchParams.get("session") ?? "";
	if (!SESSION.test(sessionId)) return fail("Invalid restore session.", 400);
	const committed = await deps.db
		.select({ id: backupRestores.id })
		.from(backupRestores)
		.where(eq(backupRestores.id, sessionId))
		.get();
	if (committed)
		return fail("Restore already completed; its media must be kept.", 409);
	const keys = await deps.listStagedKeys(
		`media/${deps.userId}/restore-${sessionId}-`,
	);
	if (keys.length) await deps.deleteObjects(keys);
	return Response.json(
		{ removed: keys.length },
		{ headers: { "cache-control": "no-store" } },
	);
}

function fail(message: string, status: number): Response {
	return Response.json(
		{ error: { code: "backup_import_failed", message } },
		{ status, headers: { "cache-control": "no-store" } },
	);
}

function sessionParams(
	request: Request,
): { id: string; index: number; kind: "original" | "preview" } | null {
	const url = new URL(request.url);
	const id = url.searchParams.get("session") ?? "";
	const index = Number(url.searchParams.get("index"));
	const kind = url.searchParams.get("kind");
	if (
		!SESSION.test(id) ||
		!Number.isInteger(index) ||
		index < 0 ||
		index >= 300 ||
		(kind !== "original" && kind !== "preview")
	)
		return null;
	return { id, index, kind };
}

function boundedStream(
	input: ReadableStream<Uint8Array>,
): ReadableStream<Uint8Array> {
	const reader = input.getReader();
	let total = 0;
	return new ReadableStream({
		async pull(controller) {
			try {
				const { done, value } = await reader.read();
				if (done) {
					controller.close();
					return;
				}
				total += value.byteLength;
				if (total > MAX_OBJECT_BYTES) {
					await reader.cancel();
					controller.error(new Error("Media object exceeds 50 MiB."));
					return;
				}
				controller.enqueue(value);
			} catch (error) {
				controller.error(error);
			}
		},
		cancel(reason) {
			return reader.cancel(reason);
		},
	});
}

export async function handleChunkedObject(
	request: Request,
	deps: ChunkedDependencies,
): Promise<Response> {
	if (request.headers.get("origin") !== new URL(request.url).origin)
		return fail("Use a same-origin restore request.", 403);
	const params = sessionParams(request);
	if (!params) return fail("Invalid restore session or object index.", 400);
	const committed = await deps.db
		.select({ id: backupRestores.id })
		.from(backupRestores)
		.where(eq(backupRestores.id, params.id))
		.get();
	if (committed) return fail("This restore has already completed.", 409);
	const contentType = request.headers.get("content-type") ?? "";
	if (
		!MEDIA_CONTENT_TYPES.some((value) => value === contentType) ||
		(params.kind === "preview" &&
			!["image/jpeg", "image/png", "image/webp"].includes(contentType))
	)
		return fail("Unsupported media type.", 415);
	if (!request.body) return fail("Media bytes are required.", 400);
	if (Number(request.headers.get("content-length")) > MAX_OBJECT_BYTES)
		return fail("Media object exceeds 50 MiB.", 413);
	const expectedSize = Number(request.headers.get("x-object-size"));
	if (
		!Number.isInteger(expectedSize) ||
		expectedSize < 0 ||
		expectedSize > MAX_OBJECT_BYTES
	)
		return fail("Invalid media size.", 400);
	const key = restoreObjectKey(
		deps.userId,
		params.id,
		params.index,
		params.kind,
	);
	try {
		await deps.writeStream(key, boundedStream(request.body), contentType);
		return Response.json(
			{ uploaded: true },
			{ headers: { "cache-control": "no-store" } },
		);
	} catch (error) {
		const existing = await deps.headObject(key);
		if (
			existing &&
			existing.contentType === contentType &&
			existing.size === expectedSize
		) {
			return Response.json(
				{ uploaded: true, alreadyUploaded: true },
				{ headers: { "cache-control": "no-store" } },
			);
		}
		console.error("Backup media staging failed", error);
		return fail("Media upload failed; retry this file before restoring.", 502);
	}
}

export async function handleChunkedFinish(
	request: Request,
	deps: ChunkedDependencies,
): Promise<Response> {
	if (
		request.headers.get("origin") !== new URL(request.url).origin ||
		request.headers.get("content-type")?.split(";")[0] !== "application/json"
	)
		return fail("Use a same-origin JSON restore request.", 403);
	const url = new URL(request.url);
	const sessionId = url.searchParams.get("session") ?? "";
	const mode = url.searchParams.get("mode");
	if (!SESSION.test(sessionId) || (mode !== "merge" && mode !== "replace"))
		return fail("Invalid restore session or mode.", 400);
	if (
		mode === "replace" &&
		request.headers.get("x-confirm-replace") !== "REPLACE"
	)
		return fail("Confirm replacement before deleting existing content.", 400);
	if (Number(request.headers.get("content-length")) > MAX_IMPORT_BYTES)
		return fail("Backup metadata exceeds 16 MiB.", 413);
	try {
		const manifest = validateBackupManifest(await readLimitedJson(request));
		const committed = await deps.db
			.select({ id: backupRestores.id, userId: backupRestores.userId })
			.from(backupRestores)
			.where(eq(backupRestores.id, sessionId))
			.get();
		if (committed)
			return committed.userId === deps.userId
				? Response.json({
						posts: manifest.posts.length,
						media: manifest.media.length,
						activity: manifest.activity.length,
						alreadyRestored: true,
					})
				: fail("Restore session belongs to another owner.", 403);
		if (
			manifest.media.some((entry) => entry.fileKey) &&
			!/^https:\/\//.test(deps.publicUrl)
		)
			return fail("Configure the R2 public URL before restoring media.", 503);
		const keys = [];
		for (const [index, entry] of manifest.media.entries()) {
			const key = entry.fileKey
				? restoreObjectKey(deps.userId, sessionId, index, "original")
				: null;
			const previewKey =
				key && entry.previewKey && "byteLength" in entry.preview
					? restoreObjectKey(deps.userId, sessionId, index, "preview")
					: null;
			for (const [objectKey, descriptor] of [
				[key, entry.original],
				[previewKey, entry.preview],
			] as const) {
				if (!objectKey || !("byteLength" in descriptor)) continue;
				const stored = await deps.headObject(objectKey);
				if (
					!stored ||
					stored.size !== descriptor.byteLength ||
					stored.contentType !== descriptor.contentType
				)
					return fail(`Missing or incomplete upload for ${entry.name}.`, 422);
			}
			keys.push({ key, previewKey });
		}
		// Restore uses only validated metadata here. Actual bytes were streamed to R2
		// per object and checked with HEAD; no base64 is decoded in the Worker.
		const bundle = {
			...manifest,
			media: manifest.media.map((entry) => ({
				...entry,
				original: { missing: true as const },
				preview: { missing: true as const },
			})),
		};
		const result = await restoreBackup(bundle, mode, deps, { sessionId, keys });
		return Response.json(result, { headers: { "cache-control": "no-store" } });
	} catch (error) {
		if (
			error instanceof Error &&
			/^Backup |^Invalid or unsupported/.test(error.message)
		)
			return fail(error.message, 422);
		console.error("Chunked restore failed", error);
		return fail("Restore failed; existing data was left intact.", 500);
	}
}
