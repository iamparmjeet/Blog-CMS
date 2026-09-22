import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "#/db";
import { user } from "#/db/auth-schema";
import { posts, settings } from "#/db/schema";
import {
	AiError,
	generateDraftStream,
	handleGenerateRequest,
} from "./ai.server";

const OWNER = "owner-1";
const OTHER = "someone-else";

function sseBody(chunks: string[]): string {
	return `${chunks
		.map(
			(content) =>
				`data: ${JSON.stringify({ choices: [{ delta: { content } }] })}`,
		)
		.join("\n\n")}\n\ndata: [DONE]\n\n`;
}

async function collectText(response: Response): Promise<string> {
	const reader = response.body?.getReader();
	expect(reader).toBeDefined();

	const decoder = new TextDecoder();
	let buffered = "";
	let text = "";

	while (reader) {
		const { done, value } = await reader.read();

		if (done) {
			break;
		}

		buffered += decoder.decode(value, { stream: true });

		let boundary = buffered.indexOf("\n\n");

		while (boundary !== -1) {
			const event = buffered.slice(0, boundary);
			buffered = buffered.slice(boundary + 2);

			for (const line of event.split("\n")) {
				if (!line.startsWith("data: ")) {
					continue;
				}

				const payload = line.slice("data: ".length);

				if (payload === "[DONE]") {
					continue;
				}

				const parsed = JSON.parse(payload) as { delta?: string };
				text += parsed.delta ?? "";
			}

			boundary = buffered.indexOf("\n\n");
		}
	}

	return text;
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

let db: Db;
let postId: number;
let otherPostId: number;

async function readDraft() {
	return db
		.select({ body: posts.body, status: posts.status })
		.from(posts)
		.where(eq(posts.id, postId))
		.get();
}

beforeEach(async () => {
	db = createThrowawayDb();

	await db.insert(user).values({
		id: OWNER,
		name: "Owner",
		email: "owner@example.com",
		createdAt: new Date("2026-01-01T00:00:00.000Z"),
	});

	await db.insert(settings).values({
		userId: OWNER,
		defaultModel: "google/gemini-2.5-flash",
		writingStyle: "Direct.",
		writingSample: "Sample voice.",
	});

	const [draft] = await db
		.insert(posts)
		.values({
			userId: OWNER,
			title: "Draft",
			slug: "draft",
			status: "draft",
			body: null,
			seoTitle: "",
			description: "",
		})
		.returning({ id: posts.id });
	const [other] = await db
		.insert(posts)
		.values({
			userId: OTHER,
			title: "Other",
			slug: "other",
			status: "draft",
			body: null,
			seoTitle: "",
			description: "",
		})
		.returning({ id: posts.id });

	postId = draft?.id ?? 0;
	otherPostId = other?.id ?? 0;
});

describe("generateDraftStream", () => {
	it("streams provider deltas and leaves the draft untouched", async () => {
		const fetchImpl = vi.fn(
			async (_url: string | URL | Request, _init?: RequestInit) => {
				return new Response(sseBody(["Hel", "lo"]), {
					status: 200,
					headers: { "content-type": "text/event-stream" },
				});
			},
		);

		const response = await generateDraftStream(
			{ userId: OWNER, postId, prompt: "Draft an intro." },
			{ db, fetchImpl, apiKey: "test-key", baseUrl: "https://stub.test/v1" },
		);

		expect(response.headers.get("content-type")).toContain("text/event-stream");
		expect(await collectText(response)).toBe("Hello");

		const [url, init] = fetchImpl.mock.calls[0] ?? [];
		expect(url).toBe("https://stub.test/v1/chat/completions");
		expect(init?.method).toBe("POST");
		expect(init?.headers).toMatchObject({
			Authorization: "Bearer test-key",
		});

		const sent = JSON.parse(init?.body as string) as {
			model: string;
			stream: boolean;
			messages: Array<{ role: string; content: string }>;
		};
		expect(sent.model).toBe("google/gemini-2.5-flash");
		expect(sent.stream).toBe(true);
		expect(sent.messages[0]?.role).toBe("system");
		expect(sent.messages[0]?.content).toContain("Direct.");
		expect(sent.messages[0]?.content).toContain("Sample voice.");

		expect(await readDraft()).toMatchObject({ body: null, status: "draft" });
	});

	it("refuses without an API key and never calls the provider", async () => {
		const fetchImpl = vi.fn(async () => new Response("{}", { status: 200 }));

		const failure = await generateDraftStream(
			{ userId: OWNER, prompt: "Draft an intro." },
			{ db, fetchImpl },
		).catch((error: unknown) => error);

		expect(failure).toBeInstanceOf(AiError);
		expect(failure as AiError).toMatchObject({
			code: "not_configured",
			status: 503,
		});
		expect(fetchImpl).not.toHaveBeenCalled();
	});

	it("maps a provider outage and leaves the draft intact", async () => {
		const fetchImpl = vi.fn(async () => {
			return new Response("overloaded", { status: 503 });
		});

		const failure = await generateDraftStream(
			{ userId: OWNER, postId, prompt: "Draft an intro." },
			{ db, fetchImpl, apiKey: "test-key", baseUrl: "https://stub.test/v1" },
		).catch((error: unknown) => error);

		expect(failure).toBeInstanceOf(AiError);
		expect(failure as AiError).toMatchObject({
			code: "provider_unavailable",
			status: 503,
		});
		expect(await readDraft()).toMatchObject({ body: null, status: "draft" });
	});

	it("rejects an unknown post without calling the provider", async () => {
		const fetchImpl = vi.fn(async () => new Response("{}", { status: 200 }));

		await expect(
			generateDraftStream(
				{ userId: OWNER, postId: 999_999, prompt: "Draft." },
				{ db, fetchImpl, apiKey: "test-key" },
			),
		).rejects.toThrow("Post not found");
		expect(fetchImpl).not.toHaveBeenCalled();
	});

	it("rejects another owner's post without calling the provider", async () => {
		const fetchImpl = vi.fn(async () => new Response("{}", { status: 200 }));

		await expect(
			generateDraftStream(
				{ userId: OWNER, postId: otherPostId, prompt: "Draft." },
				{ db, fetchImpl, apiKey: "test-key" },
			),
		).rejects.toThrow("Post not found");
		expect(fetchImpl).not.toHaveBeenCalled();
	});

	it("propagates a client abort to the upstream request", async () => {
		const controller = new AbortController();
		controller.abort();

		const fetchImpl = vi.fn(async (_url: unknown, init?: RequestInit) => {
			init?.signal?.throwIfAborted();
			return new Response("{}", { status: 200 });
		});

		await expect(
			generateDraftStream(
				{ userId: OWNER, prompt: "Draft.", signal: controller.signal },
				{
					db,
					fetchImpl,
					apiKey: "test-key",
					baseUrl: "https://stub.test/v1",
				},
			),
		).rejects.toThrow();
		expect(await readDraft()).toMatchObject({ body: null, status: "draft" });
	});
});

describe("handleGenerateRequest rate limiting", () => {
	it("answers 429 past the budget without calling the provider", async () => {
		const fetchImpl = vi.fn(
			async (_url: string | URL | Request, _init?: RequestInit) => {
				return new Response(sseBody(["Hi"]), {
					status: 200,
					headers: { "content-type": "text/event-stream" },
				});
			},
		);

		const request = () =>
			new Request("https://cms.example/api/ai/generate", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ prompt: "Draft an intro." }),
			});

		for (let attempt = 0; attempt < 10; attempt += 1) {
			const response = await handleGenerateRequest(request(), {
				db,
				userId: OWNER,
				apiKey: "test-key",
				baseUrl: "https://stub.test/v1",
				fetchImpl,
			});
			expect(response.status).toBe(200);
			await response.text();
		}

		const blocked = await handleGenerateRequest(request(), {
			db,
			userId: OWNER,
			apiKey: "test-key",
			baseUrl: "https://stub.test/v1",
			fetchImpl,
		});

		expect(blocked.status).toBe(429);
		expect(fetchImpl).toHaveBeenCalledTimes(10);

		const payload = (await blocked.json()) as {
			error?: { code?: string };
		};
		expect(payload.error?.code).toBe("rate_limited");
	});
});
