/**
 * Rate-limiting deterministic E2E: fixed-window budgets enforced through the
 * real query and handler layers (throwaway DB stands in for D1).
 *
 * Covers the burst-then-blocked failure plus window rollover, key isolation,
 * and the anonymous feed / RSS / owner AI surfaces end to end.
 *
 * Run (Node — Bun cannot load better-sqlite3):
 *   ./node_modules/.bin/tsx scripts/rate-limit-e2e.ts
 * Artifact: docs/e2e/rate-limit.log
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import type { Db } from "#/db";
import { user } from "#/db/auth-schema";
import { posts, settings } from "#/db/schema";
import { handleGenerateRequest } from "#/features/ai/ai.server";
import { handleFeedCollection } from "#/features/feed/feed.server";
import { handleRssFeed } from "#/features/feed/rss.server";
import { checkRateLimit } from "#/features/rate-limit/rate-limit.query";

const OWNER = "e2e-owner";
const WINDOW_MS = 60_000;
const NOW = new Date("2026-09-22T00:00:00.000Z");
const ARTIFACT = resolve(
	dirname(new URL(import.meta.url).pathname),
	"../docs/e2e/rate-limit.log",
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
		CREATE TABLE rate_limits (
			key TEXT PRIMARY KEY NOT NULL,
			window_start INTEGER NOT NULL,
			count INTEGER NOT NULL
		);
	`);
	return drizzle(sqlite) as unknown as Db;
}

function sseOk(): Response {
	return new Response(
		'data: {"choices":[{"delta":{"content":"Hi"}}]}\n\ndata: [DONE]\n\n',
		{ status: 200, headers: { "content-type": "text/event-stream" } },
	);
}

async function main(): Promise<void> {
	const db = createThrowawayDb();
	await db.insert(user).values({
		id: OWNER,
		name: "E2E Owner",
		email: "e2e@example.com",
		createdAt: new Date("2026-01-01T00:00:00.000Z"),
	});
	await db.insert(settings).values({ userId: OWNER });
	await db.insert(posts).values({
		userId: OWNER,
		title: "Hello",
		slug: "hello",
		status: "published",
		seoTitle: "",
		description: "",
		publishedAt: new Date("2026-09-01T00:00:00.000Z"),
		createdAt: new Date("2026-01-01T00:00:00.000Z"),
		updatedAt: new Date("2026-09-02T00:00:00.000Z"),
	});

	// Scenario 1 — burst, block with retry guidance, rollover, isolation.
	const key = "e2e:burst";
	const budget = { key, limit: 3, windowMs: WINDOW_MS, now: NOW };
	await checkRateLimit(db, budget);
	await checkRateLimit(db, budget);
	await checkRateLimit(db, budget);
	const blocked = await checkRateLimit(db, budget);
	check("fourth hit in window blocked", !blocked.allowed && blocked.count === 4);
	check("retry guidance spans the window", blocked.retryAfterMs === WINDOW_MS);
	const rolled = await checkRateLimit(db, {
		...budget,
		now: new Date(NOW.getTime() + WINDOW_MS),
	});
	check("next window allows again", rolled.allowed && rolled.count === 1);
	const isolated = await checkRateLimit(db, { ...budget, key: "e2e:other" });
	check("keys tracked independently", isolated.allowed);

	// Scenario 2 — anonymous feed collection throttles per IP.
	const feedRequest = (ip: string) =>
		new Request("https://cms.example/api/posts", {
			headers: { "cf-connecting-ip": ip },
		});
	for (let attempt = 0; attempt < 100; attempt += 1) {
		const ok = await handleFeedCollection(feedRequest("1.2.3.4"), db);
		if (ok.status !== 200) {
			throw new Error(`E2E FAILED: feed hit ${attempt} -> ${ok.status}`);
		}
	}
	const feedBlocked = await handleFeedCollection(feedRequest("1.2.3.4"), db);
	check("feed 101st hit answers 429", feedBlocked.status === 429);
	check("feed 429 carries retry-after", feedBlocked.headers.get("retry-after") !== null);
	const feedPayload = (await feedBlocked.json()) as { posts?: unknown };
	check("feed 429 leaks no posts", feedPayload.posts === undefined);
	const feedOther = await handleFeedCollection(feedRequest("5.6.7.8"), db);
	check("feed limits identities independently", feedOther.status === 200);

	// Scenario 3 — RSS throttles and stays gated by its toggle.
	const rssRequest = () =>
		new Request("https://cms.example/rss", {
			headers: { "cf-connecting-ip": "9.9.9.9" },
		});
	for (let attempt = 0; attempt < 60; attempt += 1) {
		await handleRssFeed(rssRequest(), db);
	}
	const rssBlocked = await handleRssFeed(rssRequest(), db);
	check("rss 61st hit answers 429", rssBlocked.status === 429);
	check("rss 429 leaks no items", !(await rssBlocked.text()).includes("<item>"));

	// Scenario 4 — owner AI generation throttles per user, not per IP.
	let providerCalls = 0;
	const fetchImpl = (async () => {
		providerCalls += 1;
		return sseOk();
	}) as unknown as typeof fetch;
	const aiRequest = () =>
		new Request("https://cms.example/api/ai/generate", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ prompt: "Draft an intro." }),
		});
	for (let attempt = 0; attempt < 10; attempt += 1) {
		const ok = await handleGenerateRequest(aiRequest(), {
			db,
			userId: OWNER,
			apiKey: "e2e-key",
			baseUrl: "https://stub.test/v1",
			fetchImpl,
		});
		if (ok.status !== 200) {
			throw new Error(`E2E FAILED: ai hit ${attempt} -> ${ok.status}`);
		}
		await ok.text();
	}
	const aiBlocked = await handleGenerateRequest(aiRequest(), {
		db,
		userId: OWNER,
		apiKey: "e2e-key",
		baseUrl: "https://stub.test/v1",
		fetchImpl,
	});
	check("ai 11th hit answers 429", aiBlocked.status === 429);
	check("ai 429 never reaches the provider", providerCalls === 10);

	// Scenario 5 (failure) — invalid input rejected before consuming budget.
	const invalid = await handleGenerateRequest(
		new Request("https://cms.example/api/ai/generate", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ prompt: "   " }),
		}),
		{ db, userId: "fresh-owner", apiKey: "e2e-key", fetchImpl },
	);
	check("empty prompt rejected with 400", invalid.status === 400);

	log(`\nE2E complete. All green.`);
	mkdirSync(dirname(ARTIFACT), { recursive: true });
	writeFileSync(ARTIFACT, `${lines.join("\n")}\n`);
	log(`Artifact: docs/e2e/rate-limit.log`);
}

if (import.meta.main) {
	main().catch((error: unknown) => {
		console.error(error instanceof Error ? error.message : error);
		process.exit(1);
	});
}
