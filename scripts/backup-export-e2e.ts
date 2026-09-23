/**
 * Backup-export deterministic E2E: full-instance export through the real
 * handler (owner scoping, settings round-trip, R2 bytes round-trip, missing
 * object tolerance, empty-instance bundle).
 *
 * No network involved: the throwaway DB stands in for D1 and a stub object
 * reader stands in for the R2 bucket. Covers the realistic edge of a media
 * row whose object is gone from the bucket.
 *
 * Run (Node — Bun cannot load better-sqlite3):
 *   ./node_modules/.bin/tsx scripts/backup-export-e2e.ts
 * Artifact: docs/e2e/backup-export.log
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import type { Db } from "#/db";
import { user } from "#/db/auth-schema";
import { media, posts, settings, writingActivity } from "#/db/schema";
import { BACKUP_VERSION } from "#/features/backup/backup-export";
import { handleExportRequest } from "#/features/backup/backup-export.server";

const OWNER = "e2e-owner";
const OTHER = "e2e-other";
const NOW = new Date("2026-09-23T00:00:00.000Z");
const ARTIFACT = resolve(
	dirname(new URL(import.meta.url).pathname),
	"../docs/e2e/backup-export.log",
);

const lines: string[] = [];

function log(line: string): void {
	lines.push(line);
	console.log(line);
}

function check(name: string, condition: boolean, detail = ""): void {
	if (!condition) {
		throw new Error(`E2E FAILED: ${name}${detail ? ` — ${detail}` : ""}`);
	}

	log(`PASS: ${name}`);
}

export function createThrowawayDb(): Db {
	const sqlite = new Database(":memory:");

	sqlite.exec(`
		CREATE TABLE user (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			email TEXT NOT NULL UNIQUE,
			owner_claim INTEGER NOT NULL DEFAULT 1 UNIQUE,
			email_verified INTEGER DEFAULT 0 NOT NULL,
			image TEXT,
			created_at INTEGER DEFAULT 0 NOT NULL,
			updated_at INTEGER DEFAULT 0 NOT NULL
		);
		CREATE TABLE settings (
			user_id TEXT PRIMARY KEY NOT NULL,
			display_name TEXT,
			blog_title TEXT,
			domain TEXT,
			bio TEXT,
			accent_color TEXT DEFAULT '#7c3aed' NOT NULL,
			theme_mode TEXT DEFAULT 'night' NOT NULL,
			surface_tint TEXT,
			default_model TEXT DEFAULT 'z-ai/glm-5.3-flash' NOT NULL,
			seo_meta INTEGER DEFAULT 1 NOT NULL,
			rss_feed INTEGER DEFAULT 1 NOT NULL,
			time_zone TEXT DEFAULT 'Asia/Kolkata' NOT NULL,
			reading_time INTEGER DEFAULT 0 NOT NULL,
			allowed_origins TEXT,
			umami_share_url TEXT,
			bucket_name TEXT,
			public_url TEXT,
			account_id TEXT,
			writing_style TEXT,
			writing_sample TEXT,
			updated_at INTEGER DEFAULT 0 NOT NULL
		);
		CREATE TABLE posts (
			id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
			user_id text NOT NULL,
			title text NOT NULL,
			slug text NOT NULL,
			seo_title text DEFAULT '' NOT NULL,
			status text DEFAULT 'draft' NOT NULL,
			body text,
			description text DEFAULT '' NOT NULL,
			published_at integer,
			scheduled_at integer,
			wordCount integer DEFAULT 0 NOT NULL,
			revision integer DEFAULT 0 NOT NULL,
			deleted_at integer,
			created_at integer DEFAULT 0 NOT NULL,
			updated_at integer DEFAULT 0 NOT NULL
		);
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
			preview_key text,
			preview_url text,
			preview_type text,
			preview_size text,
			status text DEFAULT 'pending' NOT NULL,
			deleted_at integer,
			created_at integer DEFAULT 0 NOT NULL
		);
		CREATE TABLE writing_activity (
			user_id text NOT NULL,
			activity_date text NOT NULL,
			words_added integer DEFAULT 0 NOT NULL,
			updated_at integer DEFAULT 0 NOT NULL,
			PRIMARY KEY (user_id, activity_date)
		);
		CREATE TABLE backup_restores (
			id TEXT PRIMARY KEY NOT NULL,
			user_id TEXT NOT NULL,
			created_at INTEGER NOT NULL
		);
	`);

	const db = drizzle(sqlite);
	// Model D1's atomic batch using the underlying SQLite transaction.
	Object.assign(db, {
		batch: async (queries: Array<{ run(): unknown }>) =>
			sqlite.transaction(() => queries.map((query) => query.run()))(),
	});
	return db as unknown as Db;
}

interface Bundle {
	version: number;
	exportedAt: string;
	posts: Array<{ slug: string; status: string; deletedAt: string | null }>;
	settings: { blogTitle: string } | null;
	media: Array<{
		name: string;
		original: { contentBase64?: string; missing?: boolean };
	}>;
	activity: Array<{ activityDate: string; wordsAdded: number }>;
}

async function main(): Promise<void> {
	const db = createThrowawayDb();

	await db.insert(user).values({
		id: OWNER,
		name: "Owner",
		email: "owner@example.com",
	});
	await db.insert(settings).values({ userId: OWNER, blogTitle: "ContentOS" });
	await db.insert(posts).values({
		userId: OWNER,
		title: "Shipped",
		slug: "shipped",
		seoTitle: "",
		status: "published",
		body: '{"type":"doc"}',
		description: "",
		publishedAt: new Date("2026-09-20T00:00:00.000Z"),
		createdAt: new Date("2026-09-19T00:00:00.000Z"),
		updatedAt: new Date("2026-09-20T00:00:00.000Z"),
	});
	await db.insert(posts).values({
		userId: OWNER,
		title: "Trashed",
		slug: "trashed",
		seoTitle: "",
		status: "draft",
		body: null,
		description: "",
		deletedAt: new Date("2026-09-21T00:00:00.000Z"),
		createdAt: new Date("2026-09-19T00:00:00.000Z"),
		updatedAt: new Date("2026-09-21T00:00:00.000Z"),
	});
	const pngBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
	await db.insert(media).values({
		userId: OWNER,
		name: "photo.png",
		type: "image/png",
		size: String(pngBytes.length),
		dims: "",
		fileKey: "media/e2e-owner/1-photo.png",
		url: "https://cdn.example/1-photo.png",
		status: "ready",
		createdAt: new Date("2026-09-19T00:00:00.000Z"),
	});
	await db.insert(media).values({
		userId: OWNER,
		name: "gone.mp4",
		type: "video/mp4",
		size: "0",
		dims: "",
		fileKey: "media/e2e-owner/2-gone.mp4",
		url: "https://cdn.example/2-gone.mp4",
		status: "ready",
		createdAt: new Date("2026-09-19T00:00:00.000Z"),
	});
	await db.insert(writingActivity).values({
		userId: OWNER,
		activityDate: "2026-09-22",
		wordsAdded: 120,
	});

	// Scenario 1 — full export round-trips bytes and metadata.
	const response = await handleExportRequest({
		db,
		userId: OWNER,
		readObject: async (key) =>
			key === "media/e2e-owner/1-photo.png"
				? { contentType: "image/png", bytes: pngBytes }
				: null,
		now: NOW,
	});
	check("export answers 200 JSON download", response.status === 200);
	check(
		"download is an attachment",
		(response.headers.get("content-disposition") ?? "").includes("attachment"),
	);
	const bundle = (await response.json()) as Bundle;
	check("bundle carries version 1", bundle.version === BACKUP_VERSION);
	check(
		"all owner posts included with statuses",
		bundle.posts.length === 2 &&
			bundle.posts.some(
				(post) => post.slug === "trashed" && post.deletedAt !== null,
			),
	);
	check(
		"settings carried without user binding",
		bundle.settings?.blogTitle === "ContentOS",
	);
	const photo = bundle.media.find((entry) => entry.name === "photo.png");
	const roundTripped = Buffer.from(
		photo?.original.contentBase64 ?? "",
		"base64",
	);
	check("R2 bytes survive base64 round-trip", roundTripped.equals(Buffer.from(pngBytes)));
	check(
		"activity days included",
		bundle.activity.some(
			(day) => day.activityDate === "2026-09-22" && day.wordsAdded === 120,
		),
	);

	// Scenario 2 — missing R2 object degrades to a marker, not a failure.
	const gone = bundle.media.find((entry) => entry.name === "gone.mp4");
	check("missing object marked, export still 200", gone?.original.missing === true);

	// Scenario 3 — unknown owner gets a versioned empty bundle.
	const emptyResponse = await handleExportRequest({
		db,
		userId: OTHER,
		readObject: async () => null,
		now: NOW,
	});
	const emptyBundle = (await emptyResponse.json()) as Bundle;
	check(
		"empty instance exports an empty versioned bundle",
		emptyResponse.status === 200 &&
			emptyBundle.version === 1 &&
			emptyBundle.posts.length === 0 &&
			emptyBundle.settings === null &&
			emptyBundle.media.length === 0 &&
			emptyBundle.activity.length === 0,
	);

	log(`\nE2E complete. All green.`);
	mkdirSync(dirname(ARTIFACT), { recursive: true });
	writeFileSync(ARTIFACT, `${lines.join("\n")}\n`);
	log(`Artifact: docs/e2e/backup-export.log`);
}

if (import.meta.main) {
	main().catch((error: unknown) => {
		console.error(error instanceof Error ? error.message : error);
		process.exit(1);
	});
}
