import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "#/db";
import {
	createPendingMedia,
	deletePendingMedia,
	markMediaReady,
	selectMediaUploadByOwner,
	selectReadyMediaByOwner,
} from "./media-upload.query";

const OWNER = "owner-1";
const OTHER_OWNER = "owner-2";

function createThrowawayDb(): Db {
	const sqlite = new Database(":memory:");

	sqlite.exec(`
		CREATE TABLE media (
			id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
			user_id text NOT NULL,
			post_id integer,
			name text NOT NULL,
			type text NOT NULL,
			size text NOT NULL,
			dims text DEFAULT '' NOT NULL,
			duration text,
			file_key text,
			url text NOT NULL,
			status text DEFAULT 'pending' NOT NULL,
			deleted_at integer,
			created_at integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
		);
	`);

	return drizzle(sqlite) as unknown as Db;
}

describe("media upload metadata", () => {
	let db: Db;

	beforeEach(() => {
		db = createThrowawayDb();
	});

	it("creates a pending media row", async () => {
		const created = await createPendingMedia(db, {
			contentType: "image/png",
			fileKey: "media/owner-1/upload-id-image.png",
			name: "image.png",
			sizeBytes: 1_024,
			url: "https://media.example.com/media/owner-1/upload-id-image.png",
			userId: OWNER,
		});

		expect(created).toMatchObject({
			name: "image.png",
			size: "1024",
			status: "pending",
			type: "image/png",
		});
	});

	it("does not expose uploads to another owner", async () => {
		const created = await createPendingMedia(db, {
			contentType: "image/png",
			fileKey: "media/owner-1/upload-id-image.png",
			name: "image.png",
			sizeBytes: 1_024,
			url: "https://media.example.com/media/owner-1/upload-id-image.png",
			userId: OWNER,
		});

		if (!created) {
			throw new Error("Could not create media fixture");
		}

		expect(
			await selectMediaUploadByOwner(db, OTHER_OWNER, created.id),
		).toBeUndefined();
	});

	it("lists only ready media owned by the caller", async () => {
		const ready = await createPendingMedia(db, {
			contentType: "image/png",
			fileKey: "media/owner-1/ready.png",
			name: "ready.png",
			sizeBytes: 1_024,
			url: "https://media.example.com/media/owner-1/ready.png",
			userId: OWNER,
		});
		const pending = await createPendingMedia(db, {
			contentType: "image/png",
			fileKey: "media/owner-1/pending.png",
			name: "pending.png",
			sizeBytes: 2_048,
			url: "https://media.example.com/media/owner-1/pending.png",
			userId: OWNER,
		});
		const otherOwners = await createPendingMedia(db, {
			contentType: "video/mp4",
			fileKey: "media/owner-2/video.mp4",
			name: "video.mp4",
			sizeBytes: 3_072,
			url: "https://media.example.com/media/owner-2/video.mp4",
			userId: OTHER_OWNER,
		});

		if (!(ready && pending && otherOwners)) {
			throw new Error("Could not create media fixtures");
		}

		await markMediaReady(db, OWNER, ready.id);
		await markMediaReady(db, OTHER_OWNER, otherOwners.id);

		expect(await selectReadyMediaByOwner(db, OWNER)).toMatchObject([
			{
				id: ready.id,
				name: "ready.png",
				status: "ready",
			},
		]);
	});

	it("lets only the owner transition pending media to ready", async () => {
		const created = await createPendingMedia(db, {
			contentType: "image/png",
			fileKey: "media/owner-1/upload-id-image.png",
			name: "image.png",
			sizeBytes: 1_024,
			url: "https://media.example.com/media/owner-1/upload-id-image.png",
			userId: OWNER,
		});

		if (!created) {
			throw new Error("Could not create media fixture");
		}

		expect(await markMediaReady(db, OTHER_OWNER, created.id)).toBeUndefined();

		const completed = await markMediaReady(db, OWNER, created.id);

		expect(completed).toMatchObject({
			id: created.id,
			status: "ready",
		});
	});

	it("does not transition ready media a second time", async () => {
		const created = await createPendingMedia(db, {
			contentType: "image/png",
			fileKey: "media/owner-1/upload-id-image.png",
			name: "image.png",
			sizeBytes: 1_024,
			url: "https://media.example.com/media/owner-1/upload-id-image.png",
			userId: OWNER,
		});

		if (!created) {
			throw new Error("Could not create media fixture");
		}

		await markMediaReady(db, OWNER, created.id);

		expect(await markMediaReady(db, OWNER, created.id)).toBeUndefined();
	});

	it("deletes only pending media owned by the caller", async () => {
		const created = await createPendingMedia(db, {
			contentType: "video/mp4",
			fileKey: "media/owner-1/upload-id-video.mp4",
			name: "video.mp4",
			sizeBytes: 2_048,
			url: "https://media.example.com/media/owner-1/upload-id-video.mp4",
			userId: OWNER,
		});

		if (!created) {
			throw new Error("Could not create media fixture");
		}

		expect(
			await deletePendingMedia(db, OTHER_OWNER, created.id),
		).toBeUndefined();

		expect(await deletePendingMedia(db, OWNER, created.id)).toEqual({
			id: created.id,
		});

		expect(
			await selectMediaUploadByOwner(db, OWNER, created.id),
		).toBeUndefined();
	});
});
