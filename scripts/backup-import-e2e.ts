/**
 * Owner-facing export → import across instances, merge, replace and failed restore.
 * Run (Node, because Bun cannot load better-sqlite3):
 *   ./node_modules/.bin/tsx scripts/backup-import-e2e.ts
 * Artifact: docs/e2e/backup-import.log
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { eq } from "drizzle-orm";
import { user } from "#/db/auth-schema";
import { media, posts, settings, writingActivity } from "#/db/schema";
import type { BackupBundle } from "#/features/backup/backup-export";
import { handleExportRequest } from "#/features/backup/backup-export.server";
import { handleImportRequest } from "#/features/backup/backup-import.server";
import { createThrowawayDb } from "./backup-export-e2e";

const artifact = resolve(
	dirname(new URL(import.meta.url).pathname),
	"../docs/e2e/backup-import.log",
);
const lines: string[] = [];
function check(name: string, pass: boolean) {
	if (!pass) throw new Error(`FAIL: ${name}`);
	lines.push(`PASS: ${name}`);
	console.log(`PASS: ${name}`);
}
const url = "https://cms.example/api/backup/import";
function request(bundle: unknown, mode: "merge" | "replace", confirm = false) {
	return new Request(`${url}?mode=${mode}`, {
		method: "POST",
		headers: {
			origin: "https://cms.example",
			"content-type": "application/json",
			...(confirm ? { "x-confirm-replace": "REPLACE" } : {}),
		},
		body: JSON.stringify(bundle),
	});
}

async function main() {
	const source = createThrowawayDb();
	const target = createThrowawayDb();
	await source
		.insert(user)
		.values({ id: "source", name: "Owner", email: "source@example.com" });
	await target
		.insert(user)
		.values({ id: "target", name: "Owner", email: "target@example.com" });
	await source
		.insert(settings)
		.values({
			userId: "source",
			blogTitle: "Source",
			bucketName: "secret-source-bucket",
		});
	await target
		.insert(settings)
		.values({ userId: "target", blogTitle: "Target" });
	const [sourcePost] = await source
		.insert(posts)
		.values({
			userId: "source",
			slug: "hello",
			title: "Hello",
			status: "published",
			body: null,
			publishedAt: new Date("2026-09-20"),
			createdAt: new Date("2026-09-19"),
			updatedAt: new Date("2026-09-20"),
		})
		.returning();
	const [sourceMedia] = await source
		.insert(media)
		.values({
			userId: "source",
			postId: sourcePost!.id,
			name: "cover.png",
			type: "image/png",
			size: "4",
			dims: "",
			fileKey: "media/source/cover.png",
			url: "https://old.example/cover.png",
			status: "ready",
			createdAt: new Date("2026-09-19"),
		})
		.returning();
	await source
		.update(posts)
		.set({
			body: JSON.stringify({
				type: "doc",
				content: [
					{
						type: "mediaAsset",
						attrs: {
							mediaId: sourceMedia!.id,
							src: "https://old.example/cover.png",
						},
					},
				],
			}),
		})
		.where(eq(posts.id, sourcePost!.id));
	await source
		.insert(writingActivity)
		.values({ userId: "source", activityDate: "2026-09-22", wordsAdded: 75 });
	await target
		.insert(posts)
		.values({
			userId: "target",
			slug: "hello",
			title: "Already here",
			createdAt: new Date("2026-09-18"),
			updatedAt: new Date("2026-09-18"),
		});
	const response = await handleExportRequest({
		db: source,
		userId: "source",
		readObject: async () => ({
			contentType: "image/png",
			bytes: new Uint8Array([1, 2, 3, 4]),
		}),
		now: new Date("2026-09-23"),
	});
	const bundle = (await response.json()) as BackupBundle;
	const objects = new Map<string, Uint8Array>();
	let failPut = false;
	const deps = {
		db: target,
		userId: "target",
		publicUrl: "https://new.example",
		putObject: async (key: string, bytes: Uint8Array) => {
			if (failPut) throw new Error("R2 unavailable");
			objects.set(key, bytes);
		},
		deleteObjects: async (keys: string[]) => {
			for (const key of keys) objects.delete(key);
		},
	};
	const merge = await handleImportRequest(request(bundle, "merge"), deps);
	check("merge returns success", merge.status === 200);
	const mergedPosts = await target
		.select()
		.from(posts)
		.where(eq(posts.userId, "target"));
	const mergedMedia = await target
		.select()
		.from(media)
		.where(eq(media.userId, "target"));
	check(
		"slug collision retains existing post and imports renamed copy",
		mergedPosts.some((row) => row.slug === "hello") &&
			mergedPosts.some((row) => row.slug === "hello-imported-2"),
	);
	check(
		"post body remaps media ID and URL",
		mergedPosts.some(
			(row) =>
				row.body?.includes(`"mediaId":${mergedMedia[0]?.id}`) &&
				row.body.includes("https://new.example/"),
		),
	);
	check(
		"media post link and bytes point at new owner",
		mergedMedia[0]?.postId ===
			mergedPosts.find((row) => row.slug === "hello-imported-2")?.id &&
			objects.get(mergedMedia[0]?.fileKey ?? "")?.join() === "1,2,3,4",
	);
	check(
		"merge keeps destination settings and activity",
		(await target.select().from(settings).get())?.blogTitle === "Target" &&
			(await target.select().from(writingActivity).get())?.wordsAdded === 75,
	);
	const noConfirm = await handleImportRequest(request(bundle, "replace"), deps);
	check("replace requires explicit confirmation", noConfirm.status === 400);
	failPut = true;
	const before = objects.size;
	const failed = await handleImportRequest(
		request(bundle, "replace", true),
		deps,
	);
	check(
		"R2 failure leaves existing rows and objects intact",
		failed.status === 500 &&
			(await target.select().from(posts).where(eq(posts.userId, "target")))
				.length === 2 &&
			objects.size === before,
	);
	failPut = false;
	const malformed = await handleImportRequest(
		request({ ...bundle, version: 900 }, "replace", true),
		deps,
	);
	check(
		"unsupported version rejected before any writes",
		malformed.status === 422 && objects.size === before,
	);
	const badOrigin = request(bundle, "replace", true);
	badOrigin.headers.set("origin", "https://outsider.example");
	check(
		"cross-site restore rejected",
		(await handleImportRequest(badOrigin, deps)).status === 403,
	);
	const batch = target.batch.bind(target);
	Object.assign(target, {
		batch: async () => {
			throw new Error("D1 unavailable");
		},
	});
	const failedDb = await handleImportRequest(
		request(bundle, "replace", true),
		deps,
	);
	Object.assign(target, { batch });
	check(
		"DB failure cleans staged R2 objects without changing content",
		failedDb.status === 500 &&
			objects.size === before &&
			(await target.select().from(posts).where(eq(posts.userId, "target")))
				.length === 2,
	);
	const replace = await handleImportRequest(
		request(bundle, "replace", true),
		deps,
	);
	const restored = await target
		.select()
		.from(posts)
		.where(eq(posts.userId, "target"));
	check(
		"replace restores source content and settings without source storage/owner",
		replace.status === 200 &&
			restored.length === 1 &&
			restored[0]?.slug === "hello" &&
			(await target.select().from(settings).get())?.blogTitle === "Source" &&
			(await target.select().from(settings).get())?.bucketName === null,
	);
	check("replace cleans previously owned R2 objects", objects.size === 1);
	const legacyBundle = structuredClone(bundle);
	for (const post of legacyBundle.posts) delete post.id;
	for (const entry of legacyBundle.media) {
		delete entry.id;
		delete entry.postId;
	}
	const legacy = await handleImportRequest(
		request(legacyBundle, "merge"),
		deps,
	);
	const legacyPosts = await target
		.select()
		.from(posts)
		.where(eq(posts.userId, "target"));
	const legacyMedia = await target
		.select()
		.from(media)
		.where(eq(media.userId, "target"));
	check(
		"older v1 backups without IDs restore media references by URL",
		legacy.status === 200 &&
			legacyPosts.some(
				(row) =>
					row.slug === "hello-imported-2" &&
					row.body?.includes(`"mediaId":${legacyMedia[1]?.id}`),
			),
	);
	lines.push("E2E complete. All green.");
	mkdirSync(dirname(artifact), { recursive: true });
	writeFileSync(artifact, `${lines.join("\n")}\n`);
	console.log("Artifact: docs/e2e/backup-import.log");
}

if (import.meta.main)
	main().catch((error: unknown) => {
		console.error(error);
		process.exitCode = 1;
	});
