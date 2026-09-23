/**
 * Run: ./node_modules/.bin/tsx scripts/backup-chunked-e2e.ts
 * Artifact: docs/e2e/backup-chunked.log
 * A >16 MiB version-1 export moves via raw streamed R2 object and a small
 * metadata-only commit; retry, missing uploads and DB failure are exercised.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { eq } from "drizzle-orm";
import { user } from "#/db/auth-schema";
import { backupRestores, media, posts, settings } from "#/db/schema";
import type { BackupBundle } from "#/features/backup/backup-export";
import { handleExportRequest } from "#/features/backup/backup-export.server";
import {
	handleChunkedCancel,
	handleChunkedFinish,
	handleChunkedObject,
} from "#/features/backup/backup-chunked.server";
import { createThrowawayDb } from "./backup-export-e2e";

const artifact = resolve(
	dirname(new URL(import.meta.url).pathname),
	"../docs/e2e/backup-chunked.log",
);
const lines: string[] = [];
function check(label: string, pass: boolean): void {
	if (!pass) throw new Error(`FAIL: ${label}`);
	lines.push(`PASS: ${label}`);
	console.log(`PASS: ${label}`);
}

async function main(): Promise<void> {
	const source = createThrowawayDb();
	const target = createThrowawayDb();
	await source
		.insert(user)
		.values({ id: "source", name: "Source", email: "source@example.com" });
	await target
		.insert(user)
		.values({ id: "target", name: "Target", email: "target@example.com" });
	await target
		.insert(settings)
		.values({ userId: "target", blogTitle: "Before" });
	await target.insert(posts).values({
		userId: "target",
		title: "Old",
		slug: "old",
		createdAt: new Date("2026-09-20"),
		updatedAt: new Date("2026-09-20"),
	});
	const [sourcePost] = await source
		.insert(posts)
		.values({
			userId: "source",
			title: "Large image",
			slug: "large-image",
			createdAt: new Date("2026-09-20"),
			updatedAt: new Date("2026-09-20"),
		})
		.returning();
	await source.insert(media).values({
		userId: "source",
		postId: sourcePost!.id,
		name: "large.png",
		type: "image/png",
		size: String(13 * 1024 * 1024),
		dims: "",
		fileKey: "media/source/large.png",
		url: "https://old.example/large.png",
		previewKey: "media/source/large.png.preview.webp",
		previewUrl: "https://old.example/large.png.preview.webp",
		previewType: "image/webp",
		previewSize: "4",
		status: "ready",
		createdAt: new Date("2026-09-20"),
	});
	const bytes = new Uint8Array(13 * 1024 * 1024);
	bytes.fill(42);
	const previewBytes = new Uint8Array([1, 2, 3, 4]);
	const exportResponse = await handleExportRequest({
		db: source,
		userId: "source",
		readObject: async (key) =>
			key.endsWith("preview.webp")
				? { contentType: "image/webp", bytes: previewBytes }
				: { contentType: "image/png", bytes },
		now: new Date("2026-09-23"),
	});
	const backupText = await exportResponse.text();
	check(
		"real export exceeds the one-shot 16 MiB limit",
		new TextEncoder().encode(backupText).length > 16 * 1024 * 1024,
	);
	const bundle = JSON.parse(backupText) as BackupBundle;
	const manifest = {
		...bundle,
		media: bundle.media.map((entry) => ({
			...entry,
			original: { contentType: "image/png", byteLength: bytes.length },
			preview: { contentType: "image/webp", byteLength: previewBytes.length },
		})),
	};
	const objects = new Map<string, { bytes: Uint8Array; contentType: string }>();
	const deps = {
		db: target,
		userId: "target",
		publicUrl: "https://new.example",
		putObject: async () => {
			throw new Error("one-shot object write should not run");
		},
		deleteObjects: async (keys: string[]) => {
			for (const key of keys) objects.delete(key);
		},
		writeStream: async (
			key: string,
			stream: ReadableStream<Uint8Array>,
			contentType: string,
		) => {
			if (objects.has(key)) throw new Error("immutable key already exists");
			const chunks: Uint8Array[] = [];
			for await (const chunk of stream) chunks.push(chunk);
			const data = new Uint8Array(
				chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0),
			);
			let offset = 0;
			for (const chunk of chunks) {
				data.set(chunk, offset);
				offset += chunk.byteLength;
			}
			objects.set(key, { bytes: data, contentType });
		},
		headObject: async (key: string) => {
			const object = objects.get(key);
			return object
				? { size: object.bytes.byteLength, contentType: object.contentType }
				: null;
		},
		listStagedKeys: async (prefix: string) =>
			[...objects.keys()].filter((key) => key.startsWith(prefix)),
	};
	const base = "https://cms.example/api/backup/session";
	const finishRequest = (session: string) =>
		new Request(`${base}?session=${session}&mode=replace`, {
			method: "POST",
			headers: {
				origin: "https://cms.example",
				"content-type": "application/json",
				"x-confirm-replace": "REPLACE",
			},
			body: JSON.stringify(manifest),
		});
	const uploadRequest = (
		session: string,
		kind: "original" | "preview" = "original",
	) => {
		const data = kind === "preview" ? previewBytes : bytes;
		return new Request(`${base}?session=${session}&index=0&kind=${kind}`, {
			method: "PUT",
			headers: {
				origin: "https://cms.example",
				"content-type": kind === "preview" ? "image/webp" : "image/png",
				"x-object-size": String(data.length),
			},
			body: new Blob([data]),
		});
	};
	const missingId = crypto.randomUUID();
	check(
		"missing upload does not replace existing rows",
		(await handleChunkedFinish(finishRequest(missingId), deps)).status ===
			422 &&
			(await target.select().from(posts).where(eq(posts.userId, "target")))[0]
				?.slug === "old",
	);
	const id = crypto.randomUUID();
	check(
		"large raw object streams to R2 binding",
		(await handleChunkedObject(uploadRequest(id), deps)).status === 200 &&
			objects.size === 1,
	);
	const uploadRetry = await handleChunkedObject(uploadRequest(id), deps);
	check(
		"lost upload response can be retried without overwriting bytes",
		uploadRetry.status === 200 &&
			((await uploadRetry.json()) as { alreadyUploaded?: boolean })
				.alreadyUploaded === true &&
			objects.size === 1,
	);
	check(
		"preview required before final commit",
		(await handleChunkedFinish(finishRequest(id), deps)).status === 422,
	);
	check(
		"preview uploads independently",
		(await handleChunkedObject(uploadRequest(id, "preview"), deps)).status ===
			200 && objects.size === 2,
	);
	const done = await handleChunkedFinish(finishRequest(id), deps);
	const result = (await done.json()) as { media: number };
	const restored = await target
		.select()
		.from(media)
		.where(eq(media.userId, "target"));
	check(
		"metadata-only commit replaces rows with remapped owner media",
		done.status === 200 &&
			result.media === 1 &&
			restored[0]?.postId !== null &&
			restored[0]?.url.startsWith("https://new.example/media/target/") ===
				true &&
			objects.get(restored[0]?.fileKey ?? "")?.bytes.byteLength ===
				bytes.length &&
			objects.get(restored[0]?.previewKey ?? "")?.bytes.join() === "1,2,3,4",
	);
	const retry = await handleChunkedFinish(finishRequest(id), deps);
	check(
		"lost-response retry is idempotent",
		retry.status === 200 &&
			((await retry.json()) as { alreadyRestored?: boolean })
				.alreadyRestored === true &&
			(await target.select().from(posts).where(eq(posts.userId, "target")))
				.length === 1,
	);
	check(
		"D1 commit marker recorded once",
		(await target.select().from(backupRestores)).length === 1,
	);
	const cancelRequest = (session: string) =>
		new Request(`${base}?session=${session}`, {
			method: "DELETE",
			headers: { origin: "https://cms.example" },
		});
	check(
		"cancel cannot remove committed media",
		(await handleChunkedCancel(cancelRequest(id), deps)).status === 409 &&
			objects.size === 2,
	);
	const abandoned = crypto.randomUUID();
	await handleChunkedObject(uploadRequest(abandoned), deps);
	check(
		"cancel removes staged media before commit",
		(await handleChunkedCancel(cancelRequest(abandoned), deps)).status ===
			200 && objects.size === 2,
	);
	const failingId = crypto.randomUUID();
	await handleChunkedObject(uploadRequest(failingId), deps);
	await handleChunkedObject(uploadRequest(failingId, "preview"), deps);
	const originalBatch = target.batch.bind(target);
	Object.assign(target, {
		batch: async () => {
			throw new Error("D1 outage");
		},
	});
	const failed = await handleChunkedFinish(finishRequest(failingId), deps);
	Object.assign(target, { batch: originalBatch });
	check(
		"failed commit removes staged bytes without deleting restored content",
		failed.status === 500 &&
			objects.size === 2 &&
			(await target.select().from(posts).where(eq(posts.userId, "target")))[0]
				?.slug === "large-image",
	);
	lines.push("E2E complete. All green.");
	mkdirSync(dirname(artifact), { recursive: true });
	writeFileSync(artifact, `${lines.join("\n")}\n`);
	console.log("Artifact: docs/e2e/backup-chunked.log");
}

if (import.meta.main)
	main().catch((error: unknown) => {
		console.error(error);
		process.exitCode = 1;
	});
