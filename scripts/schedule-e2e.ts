/**
 * T5.3 deterministic E2E: scheduled publishing through the real query layer
 * (timezone-aware scheduling, idempotent cron promotion, worker wiring).
 *
 * No network involved: the throwaway DB stands in for D1, and the cron
 * entry plus wrangler config are asserted statically. Covers the past-
 * instant failure plus the exactly-once edge (double promotion run, as
 * after a worker restart).
 *
 * Run (Node — Bun cannot load better-sqlite3):
 *   ./node_modules/.bin/tsx scripts/schedule-e2e.ts
 * Artifact: docs/e2e/t5.3-schedule.log
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import type { Db } from "#/db";
import { user } from "#/db/auth-schema";
import { posts, settings } from "#/db/schema";
import { promoteDueScheduledPosts } from "#/features/posts/functions/promote-scheduled.query";
import {
	savePostSchedule,
	savePostScheduleInputSchema,
} from "#/features/posts/functions/save-post-schedule.query";

const OWNER = "e2e-owner";
const NOW = new Date("2026-09-22T00:00:00.000Z");
const DUE = new Date("2026-09-23T04:30:00.000Z");
const AFTER_RESTART = new Date("2026-09-23T05:00:00.000Z");
const ARTIFACT = resolve(
	dirname(new URL(import.meta.url).pathname),
	"../docs/e2e/t5.3-schedule.log",
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

function createThrowawayDb(): Db {
	const sqlite = new Database(":memory:");
	sqlite.exec(`
		CREATE TABLE user (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			email TEXT NOT NULL UNIQUE,
			owner_claim INTEGER NOT NULL DEFAULT 1 UNIQUE,
			email_verified INTEGER DEFAULT 0 NOT NULL,
			image TEXT,
			created_at INTEGER DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
			updated_at INTEGER DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
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
			default_model TEXT DEFAULT 'google/gemini-2.5-flash' NOT NULL,
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
			updated_at INTEGER DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
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
			created_at integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
			updated_at integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
			CONSTRAINT "posts_status_valid"
			CHECK("status" in ('draft', 'published', 'scheduled', 'archived')),
			CONSTRAINT "posts_user_id_slug_unique" UNIQUE("user_id", "slug")
		);
	`);
	return drizzle(sqlite) as unknown as Db;
}

async function main(): Promise<void> {
	const db = createThrowawayDb();
	await db.insert(user).values({
		id: OWNER,
		name: "E2E Owner",
		email: "e2e@example.com",
		createdAt: new Date("2026-01-01T00:00:00.000Z"),
	});
	await db.insert(settings).values({ userId: OWNER, timeZone: "Asia/Kolkata" });

	async function seedPost(slug: string, status = "draft") {
		const [row] = await db
			.insert(posts)
			.values({
				userId: OWNER,
				title: slug,
				slug,
				status,
				seoTitle: "",
				description: "",
				createdAt: new Date("2026-01-01T00:00:00.000Z"),
				updatedAt: new Date("2026-01-01T00:00:00.000Z"),
			})
			.returning({ id: posts.id });

		return row?.id ?? 0;
	}

	const postId = await seedPost("compost-guide");
	const futureId = await seedPost("future-post");

	async function readPost(id: number) {
		return db
			.select({
				status: posts.status,
				publishedAt: posts.publishedAt,
				scheduledAt: posts.scheduledAt,
			})
			.from(posts)
			.where(eq(posts.id, id))
			.get();
	}

	// Scenario 1 — schedule at a Kolkata wall time through the validated input.
	const validated = savePostScheduleInputSchema.parse({
		postId,
		dateTimeLocal: "2026-09-23T10:00",
	});
	const saved = await savePostSchedule(db, {
		userId: OWNER,
		...validated,
		now: NOW,
	});
	check("schedule stores the timezone-correct instant", saved.scheduledAt === DUE.toISOString(), saved.scheduledAt ?? "null");
	check("schedule flips status to scheduled", saved.status === "scheduled");

	// Scenario 2 — the cron promoter publishes the due post once.
	const first = await promoteDueScheduledPosts(db, DUE);
	check("promoter publishes the due post", JSON.stringify(first.postIds) === JSON.stringify([postId]));
	check("promoted row is published with the promotion instant", JSON.stringify(await readPost(postId)) === JSON.stringify({
		status: "published",
		publishedAt: DUE,
		scheduledAt: null,
	}));

	// Scenario 3 — a second run (e.g. after a worker restart) is a no-op.
	const second = await promoteDueScheduledPosts(db, AFTER_RESTART);
	check("second promotion run changes nothing", second.postIds.length === 0);
	check("publishedAt stays stable across runs", (await readPost(postId))?.publishedAt?.toISOString() === DUE.toISOString());

	// Scenario 4 (failure) — a past instant is rejected, draft untouched.
	const pastError = await savePostSchedule(db, {
		userId: OWNER,
		postId: futureId,
		dateTimeLocal: "2026-09-21T10:00",
		now: NOW,
	}).catch((error: unknown) => error);
	check("past instant rejected", pastError instanceof Error && pastError.message.includes("must be in the future"));
	check("draft unchanged after rejected schedule", JSON.stringify(await readPost(futureId)) === JSON.stringify({
		status: "draft",
		publishedAt: null,
		scheduledAt: null,
	}));

	// Scenario 5 — unschedule returns a scheduled post to draft.
	await savePostSchedule(db, {
		userId: OWNER,
		postId: futureId,
		dateTimeLocal: "2026-09-24T10:00",
		now: NOW,
	});
	const unscheduled = await savePostSchedule(db, {
		userId: OWNER,
		postId: futureId,
		dateTimeLocal: null,
		now: NOW,
	});
	check("unschedule clears back to draft", unscheduled.status === "draft" && unscheduled.scheduledAt === null);

	// Scenario 6 — worker wiring is declared.
	const repoRoot = resolve(dirname(new URL(import.meta.url).pathname), "..");
	const wrangler = JSON.parse(
		readFileSync(resolve(repoRoot, "wrangler.jsonc"), "utf8"),
	) as { main?: string; triggers?: { crons?: string[] } };
	check("wrangler uses the custom worker entry", wrangler.main === "src/server.ts", wrangler.main ?? "missing");
	check("wrangler declares a cron trigger", (wrangler.triggers?.crons ?? []).includes("*/5 * * * *"));
	const entry = readFileSync(resolve(repoRoot, "src/server.ts"), "utf8");
	check("worker entry runs the promoter on schedule", entry.includes("promoteDueScheduledPosts") && entry.includes("scheduled"));

	log(`\nE2E complete. All green.`);
	mkdirSync(dirname(ARTIFACT), { recursive: true });
	writeFileSync(ARTIFACT, `${lines.join("\n")}\n`);
	log(`Artifact: docs/e2e/t5.3-schedule.log`);
}

if (import.meta.main) {
	main().catch((error: unknown) => {
		console.error(error instanceof Error ? error.message : error);
		process.exit(1);
	});
}
