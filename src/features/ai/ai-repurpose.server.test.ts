import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "#/db";
import { user } from "#/db/auth-schema";
import { posts, settings } from "#/db/schema";
import { serializePostBody } from "#/features/posts/functions/post-body";
import { AiError, repurposePostStream } from "./ai.server";

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

const SOURCE_BODY = serializePostBody({
	type: "doc",
	content: [
		{
			type: "paragraph",
			content: [{ type: "text", text: "Compost happens fast." }],
		},
	],
});

let db: Db;
let postId: number;
let emptyPostId: number;
let otherPostId: number;

async function readSource() {
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
		defaultModel: "openai/gpt-4o-mini",
		writingStyle: "Direct.",
		writingSample: "",
	});

	async function seedPost(values: {
		userId: string;
		slug: string;
		body: string | null;
	}) {
		const [row] = await db
			.insert(posts)
			.values({
				title: values.slug,
				status: "published",
				seoTitle: "",
				description: "",
				...values,
			})
			.returning({ id: posts.id });

		return row?.id ?? 0;
	}

	postId = await seedPost({ userId: OWNER, slug: "source", body: SOURCE_BODY });
	emptyPostId = await seedPost({ userId: OWNER, slug: "empty", body: null });
	otherPostId = await seedPost({
		userId: OTHER,
		slug: "foreign",
		body: SOURCE_BODY,
	});
});

describe("repurposePostStream", () => {
	it("streams a labeled variant and leaves the source post untouched", async () => {
		const fetchImpl = vi.fn(
			async (_url: string | URL | Request, _init?: RequestInit) => {
				return new Response(sseBody(["🧵 ", "1/ Compost!"]), {
					status: 200,
					headers: { "content-type": "text/event-stream" },
				});
			},
		);

		const response = await repurposePostStream(
			{ userId: OWNER, postId, platform: "twitter" },
			{ db, fetchImpl, apiKey: "test-key", baseUrl: "https://stub.test/v1" },
		);

		expect(response.headers.get("content-type")).toContain("text/event-stream");
		expect(await collectText(response)).toBe("🧵 1/ Compost!");

		const [, init] = fetchImpl.mock.calls[0] ?? [];
		const sent = JSON.parse(init?.body as string) as {
			model: string;
			stream: boolean;
			messages: Array<{ role: string; content: string }>;
		};
		expect(sent.model).toBe("openai/gpt-4o-mini");
		expect(sent.stream).toBe(true);
		expect(sent.messages[0]?.content).toContain("Twitter");
		expect(sent.messages[1]?.content).toContain("Compost happens fast.");

		expect(await readSource()).toMatchObject({
			body: SOURCE_BODY,
			status: "published",
		});
	});

	it("refuses an empty source without calling the provider", async () => {
		const fetchImpl = vi.fn(
			async (_url: string | URL | Request, _init?: RequestInit) =>
				new Response("{}", { status: 200 }),
		);

		const failure = await repurposePostStream(
			{ userId: OWNER, postId: emptyPostId, platform: "linkedin" },
			{ db, fetchImpl, apiKey: "test-key", baseUrl: "https://stub.test/v1" },
		).catch((error: unknown) => error);

		expect(failure).toBeInstanceOf(AiError);
		expect(failure as AiError).toMatchObject({
			code: "empty_source",
			status: 422,
		});
		expect(fetchImpl).not.toHaveBeenCalled();
	});

	it("rejects another owner's post without calling the provider", async () => {
		const fetchImpl = vi.fn(
			async (_url: string | URL | Request, _init?: RequestInit) =>
				new Response("{}", { status: 200 }),
		);

		await expect(
			repurposePostStream(
				{ userId: OWNER, postId: otherPostId, platform: "reels" },
				{ db, fetchImpl, apiKey: "test-key" },
			),
		).rejects.toThrow("Post not found");
		expect(fetchImpl).not.toHaveBeenCalled();
	});

	it("maps a provider outage and leaves the source intact", async () => {
		const fetchImpl = vi.fn(
			async (_url: string | URL | Request, _init?: RequestInit) =>
				new Response("overloaded", { status: 503 }),
		);

		const failure = await repurposePostStream(
			{ userId: OWNER, postId, platform: "instagram" },
			{ db, fetchImpl, apiKey: "test-key", baseUrl: "https://stub.test/v1" },
		).catch((error: unknown) => error);

		expect(failure).toBeInstanceOf(AiError);
		expect(failure as AiError).toMatchObject({
			code: "provider_unavailable",
			status: 503,
		});
		expect(await readSource()).toMatchObject({
			body: SOURCE_BODY,
			status: "published",
		});
	});

	it("refuses without an API key and never calls the provider", async () => {
		const fetchImpl = vi.fn(
			async (_url: string | URL | Request, _init?: RequestInit) =>
				new Response("{}", { status: 200 }),
		);

		const failure = await repurposePostStream(
			{ userId: OWNER, postId, platform: "twitter" },
			{ db, fetchImpl },
		).catch((error: unknown) => error);

		expect(failure).toBeInstanceOf(AiError);
		expect(failure as AiError).toMatchObject({
			code: "not_configured",
			status: 503,
		});
		expect(fetchImpl).not.toHaveBeenCalled();
	});
});
