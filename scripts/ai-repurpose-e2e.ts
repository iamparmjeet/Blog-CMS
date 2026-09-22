/**
 * T5.2 deterministic E2E: social repurposing against a stub OpenRouter
 * server through the real orchestration path (input validation, source
 * extraction, owner profile resolution, ownership check, SSE normalization).
 *
 * The only stubbed boundary is the external provider network call.
 * Covers a provider outage plus the empty-source and cancellation edges.
 * Acceptance focus: variants are labeled by target format, copying never
 * touches the source post (generation is read-only server-side).
 *
 * Run (Node — Bun cannot load better-sqlite3):
 *   ./node_modules/.bin/tsx scripts/ai-repurpose-e2e.ts
 * Artifact: docs/e2e/t5.2-repurpose.log
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { dirname, resolve } from "node:path";
import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import type { Db } from "#/db";
import { user } from "#/db/auth-schema";
import { posts, settings } from "#/db/schema";
import { serializePostBody } from "#/features/posts/functions/post-body";
import { AiError, repurposePostStream } from "#/features/ai/ai.server";
import { repurposeInputSchema } from "#/features/ai/ai-repurpose";
import { createSseParser } from "#/features/ai/ai-stream";

type StubMode = "success" | "outage" | "hang";

const OWNER = "e2e-owner";
const ARTIFACT = resolve(
	dirname(new URL(import.meta.url).pathname),
	"../docs/e2e/t5.2-repurpose.log",
);

const lines: string[] = [];
let stubRequests = 0;
let lastAuthorization: string | null = null;
let lastSystemPrompt: string | null = null;
let lastUserMessage: string | null = null;
let mode: StubMode = "success";

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

function sseEvent(payload: unknown): string {
	return `data: ${JSON.stringify(payload)}\n\n`;
}

function handleStub(request: IncomingMessage, response: ServerResponse): void {
	if (request.method !== "POST") {
		response.writeHead(405).end();
		return;
	}

	let body = "";
	request.on("data", (chunk: Buffer) => {
		body += chunk.toString();
	});
	request.on("end", () => {
		stubRequests += 1;
		lastAuthorization = (request.headers.authorization as string) ?? null;

		try {
			const parsed = JSON.parse(body) as {
				messages?: Array<{ role?: string; content?: string }>;
			};
			lastSystemPrompt =
				parsed.messages?.find((message) => message.role === "system")
					?.content ?? null;
			lastUserMessage =
				parsed.messages?.find((message) => message.role === "user")
					?.content ?? null;
		} catch {
			lastSystemPrompt = null;
			lastUserMessage = null;
		}

		if (mode === "outage") {
			response.writeHead(503, { "content-type": "text/plain" }).end("overloaded");
			return;
		}

		response.writeHead(200, {
			"content-type": "text/event-stream",
			"cache-control": "no-cache",
		});

		if (mode === "hang") {
			response.write(
				sseEvent({ choices: [{ delta: { content: "Partial variant" } }] }),
			);
			request.on("close", () => response.destroy());
			return;
		}

		response.write(sseEvent({ choices: [{ delta: { content: "🧵 " } }] }));
		setTimeout(() => {
			response.write(sseEvent({ choices: [{ delta: { content: "1/ Compost!" } }] }));
			response.write("data: [DONE]\n\n");
			response.end();
		}, 50);
	});
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

async function collectNormalized(response: Response): Promise<string> {
	const parser = createSseParser();
	const reader = response.body?.getReader();

	if (!reader) {
		throw new Error("E2E FAILED: response has no body");
	}

	const decoder = new TextDecoder();

	for (;;) {
		const { done, value } = await reader.read();

		if (done) {
			break;
		}

		const chunk = decoder.decode(value, { stream: true });

		for (const line of chunk.split("\n")) {
			if (!line.startsWith("data: ")) {
				continue;
			}

			const payload = line.slice("data: ".length);

			if (payload === "[DONE]") {
				continue;
			}

			const parsed = JSON.parse(payload) as { delta?: string };
			parser.feed(`data: ${JSON.stringify({ choices: [{ delta: { content: parsed.delta ?? "" } }] })}\n\n`);
		}

		if (chunk.includes("[DONE]")) {
			break;
		}
	}

	reader.releaseLock();
	return parser.text;
}

async function main(): Promise<void> {
	const db = createThrowawayDb();
	await db.insert(user).values({
		id: OWNER,
		name: "E2E Owner",
		email: "e2e@example.com",
		createdAt: new Date("2026-09-22T00:00:00.000Z"),
	});
	await db.insert(settings).values({
		userId: OWNER,
		defaultModel: "google/gemini-2.5-flash",
		writingStyle: "Direct.",
		writingSample: "",
	});
	const sourceBody = serializePostBody({
		type: "doc",
		content: [
			{
				type: "paragraph",
				content: [{ type: "text", text: "Compost happens fast." }],
			},
		],
	});
	const [source] = await db
		.insert(posts)
		.values({
			userId: OWNER,
			title: "Compost guide",
			slug: "compost-guide",
			status: "published",
			body: sourceBody,
			seoTitle: "",
			description: "",
		})
		.returning({ id: posts.id });
	const [empty] = await db
		.insert(posts)
		.values({
			userId: OWNER,
			title: "Empty",
			slug: "empty",
			status: "draft",
			body: null,
			seoTitle: "",
			description: "",
		})
		.returning({ id: posts.id });
	const postId = source?.id ?? 0;
	const emptyPostId = empty?.id ?? 0;

	const server = createServer(handleStub);
	await new Promise<void>((resolveListening) => {
		server.listen(0, "127.0.0.1", resolveListening);
	});
	const address = server.address();

	if (!address || typeof address === "string") {
		throw new Error("E2E FAILED: stub server did not bind");
	}

	const baseUrl = `http://127.0.0.1:${address.port}/v1`;

	async function readSource() {
		return db
			.select({ body: posts.body, status: posts.status })
			.from(posts)
			.where(eq(posts.id, postId))
			.get();
	}

	const pristine = JSON.stringify(await readSource());

	try {
		// Scenario 1 — twitter variant streams, source untouched.
		mode = "success";
		const validated = repurposeInputSchema.parse({
			postId,
			platform: "twitter",
		});
		const okResponse = await repurposePostStream(
			{ userId: OWNER, ...validated },
			{ db, apiKey: "e2e-key", baseUrl },
		);
		const text = await collectNormalized(okResponse);
		check("success streams the stubbed variant", text === "🧵 1/ Compost!", text);
		check("request carries the bearer key", lastAuthorization === "Bearer e2e-key", lastAuthorization ?? "null");
		check("system prompt labels the Twitter format", (lastSystemPrompt ?? "").includes("Twitter"));
		check("user message carries the source text", (lastUserMessage ?? "").includes("Compost happens fast."));
		check("source post unchanged after success", JSON.stringify(await readSource()) === pristine);

		// Scenario 2 — empty source rejected before any provider call.
		const before = stubRequests;
		const emptyError = await repurposePostStream(
			{ userId: OWNER, postId: emptyPostId, platform: "linkedin" },
			{ db, apiKey: "e2e-key", baseUrl },
		).catch((error: unknown) => error);
		check("empty source maps to empty_source", emptyError instanceof AiError && emptyError.code === "empty_source");
		check("no provider request for empty source", stubRequests === before);

		// Scenario 3 — provider outage maps cleanly, source intact.
		mode = "outage";
		const outageError = await repurposePostStream(
			{ userId: OWNER, postId, platform: "reels" },
			{ db, apiKey: "e2e-key", baseUrl },
		).catch((error: unknown) => error);
		check("outage maps to provider_unavailable", outageError instanceof AiError && outageError.code === "provider_unavailable");
		check("source post unchanged after outage", JSON.stringify(await readSource()) === pristine);

		// Scenario 4 — missing key never touches the provider.
		mode = "success";
		const beforeKey = stubRequests;
		const configError = await repurposePostStream(
			{ userId: OWNER, postId, platform: "instagram" },
			{ db, baseUrl },
		).catch((error: unknown) => error);
		check("missing key maps to not_configured", configError instanceof AiError && (configError as AiError).code === "not_configured");
		check("no provider request without a key", stubRequests === beforeKey);

		// Scenario 5 — mid-stream abort surfaces to the reader.
		mode = "hang";
		const abortController = new AbortController();
		const abortResponse = await repurposePostStream(
			{ userId: OWNER, postId, platform: "twitter", signal: abortController.signal },
			{ db, apiKey: "e2e-key", baseUrl },
		);
		const abortReader = abortResponse.body?.getReader();
		const first = await abortReader?.read();
		abortController.abort();
		const aborted = await abortReader
			?.read()
			.then(() => false)
			.catch(() => true);
		check("mid-stream abort surfaces to the reader", first !== undefined && aborted === true);
		check("source post unchanged after abort", JSON.stringify(await readSource()) === pristine);

		log(`\nE2E complete: stub saw ${stubRequests} provider request(s). All green.`);
		mkdirSync(dirname(ARTIFACT), { recursive: true });
		writeFileSync(ARTIFACT, `${lines.join("\n")}\n`);
		log(`Artifact: docs/e2e/t5.2-repurpose.log`);
	} finally {
		server.close();
	}
}

if (import.meta.main) {
	main().catch((error: unknown) => {
		console.error(error instanceof Error ? error.message : error);
		process.exit(1);
	});
}
