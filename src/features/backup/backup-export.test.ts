import { describe, expect, it } from "vitest";
import { BACKUP_VERSION, buildBackupBundle } from "./backup-export";

const EXPORTED_AT = "2026-09-23T00:00:00.000Z";

describe("buildBackupBundle", () => {
	it("emits a versioned empty bundle", () => {
		const bundle = buildBackupBundle({
			exportedAt: EXPORTED_AT,
			posts: [],
			settings: null,
			media: [],
			activity: [],
		});

		expect(bundle).toEqual({
			version: BACKUP_VERSION,
			exportedAt: EXPORTED_AT,
			posts: [],
			settings: null,
			media: [],
			activity: [],
		});
		expect(BACKUP_VERSION).toBe(1);
	});

	it("preserves posts with statuses and timestamps", () => {
		const bundle = buildBackupBundle({
			exportedAt: EXPORTED_AT,
			posts: [
				{
					id: 1,
					title: "Live post",
					slug: "live-post",
					seoTitle: "",
					status: "published",
					body: '{"type":"doc"}',
					description: "desc",
					publishedAt: new Date("2026-09-20T00:00:00.000Z"),
					scheduledAt: null,
					wordCount: 42,
					revision: 3,
					deletedAt: null,
					createdAt: new Date("2026-09-19T00:00:00.000Z"),
					updatedAt: new Date("2026-09-20T00:00:00.000Z"),
				},
				{
					id: 2,
					title: "Trashed post",
					slug: "trashed-post",
					seoTitle: "",
					status: "draft",
					body: null,
					description: "",
					publishedAt: null,
					scheduledAt: null,
					wordCount: 0,
					revision: 1,
					deletedAt: new Date("2026-09-21T00:00:00.000Z"),
					createdAt: new Date("2026-09-19T00:00:00.000Z"),
					updatedAt: new Date("2026-09-21T00:00:00.000Z"),
				},
			],
			settings: null,
			media: [],
			activity: [],
		});

		expect(bundle.posts).toHaveLength(2);
		expect(bundle.posts[0]).toMatchObject({
			slug: "live-post",
			status: "published",
			publishedAt: "2026-09-20T00:00:00.000Z",
			wordCount: 42,
		});
		expect(bundle.posts[1]).toMatchObject({
			slug: "trashed-post",
			deletedAt: "2026-09-21T00:00:00.000Z",
		});
	});

	it("base64-encodes stored objects and tolerates missing ones", () => {
		const bundle = buildBackupBundle({
			exportedAt: EXPORTED_AT,
			posts: [],
			settings: null,
			media: [
				{
					row: {
						id: 1,
						postId: null,
						name: "photo.png",
						type: "image/png",
						size: "12",
						dims: "2x2",
						duration: null,
						fileKey: "media/owner/1-photo.png",
						url: "https://cdn.example/1-photo.png",
						previewKey: "media/owner/1-photo.preview.webp",
						previewUrl: "https://cdn.example/1-photo.preview.webp",
						previewType: "image/webp",
						previewSize: "8",
						status: "ready",
						deletedAt: null,
						createdAt: new Date("2026-09-19T00:00:00.000Z"),
					},
					original: {
						contentType: "image/png",
						bytes: new Uint8Array([137, 80, 78, 71]),
					},
					preview: null,
				},
			],
			activity: [],
		});

		expect(bundle.media).toHaveLength(1);
		const [entry] = bundle.media;
		expect(entry?.original).toEqual({
			contentType: "image/png",
			contentBase64: Buffer.from([137, 80, 78, 71]).toString("base64"),
		});
		expect(entry?.preview).toEqual({ missing: true });
	});

	it("passes settings and activity rows through", () => {
		const bundle = buildBackupBundle({
			exportedAt: EXPORTED_AT,
			posts: [],
			settings: {
				blogTitle: "ContentOS",
				timeZone: "Asia/Kolkata",
				defaultModel: "z-ai/glm-5.3-flash",
			},
			media: [],
			activity: [{ activityDate: "2026-09-22", wordsAdded: 120 }],
		});

		expect(bundle.settings).toMatchObject({ blogTitle: "ContentOS" });
		expect(bundle.activity).toEqual([
			{ activityDate: "2026-09-22", wordsAdded: 120 },
		]);
	});
});
