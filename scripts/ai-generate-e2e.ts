/**
 * T5.1 deterministic E2E: AI draft generation against a stub OpenRouter
 * server through the real orchestration path (input validation, owner
 * profile resolution, post-ownership check, SSE normalization).
 *
 * The only stubbed boundary is the external provider network call —
 * everything else (throwaway D1-shaped DB, settings profile, draft rows)
 * is real. Covers one realistic failure (provider 503 outage) plus the
 * not-configured and cancellation edge cases.
 *
 * Run: bun run scripts/ai-generate-e2e.ts
 * Artifact: docs/e2e/t5.1-ai-generate.log
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
import { generateInputSchema } from "#/features/ai/ai-prompts";
import { AiError, generateDraftStream } from "#/features/ai/ai.server";
import { createSseParser } from "#/features/ai/ai-stream";

type StubMode = "success" | "outage" | "hang";

const OWNER = "e2e-owner";
const ARTIFACT = resolve(
	dirname(new URL(import.meta.url).pathname),
	"../docs/e2e/t5.1-ai-generate.log",
);

const lines: string[] = [];
let stubRequests = 0;
let lastAuthorization: string | null = null;
let lastSystemPrompt: string | null = null;
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
				model?: string;
				messages?: Array<{ role?: string; content?: string }>;
			};
			lastSystemPrompt =
				parsed.messages?.find((message) => message.role === "system")
					?.content ?? null;
		} catch {
			lastSystemPrompt = null;
		}

		if (mode === "outage") {
			response.writeHead(503, { "content-type": "text/plain" }).end("overloaded");
			return;
		}

		if (mode === "hang") {
			response.writeHead(200, {
				"content-type": "text/event-stream",
				"cache-control": "no-cache",
			});
			response.write(
				sseEvent({ choices: [{ delta: { content: "Partial" } }] }),
			);
			// Hold the stream open: the scenario aborts mid-stream, which is
			// the only thing that ends this response.
			request.on("close", () => response.destroy());
			return;
		}

		response.writeHead(200, {
			"content-type": "text/event-stream",
			"cache-control": "no-cache",
		});
		response.write(
			sseEvent({ choices: [{ delta: { content: "Hello" } }] }),
		);
		setTimeout(() => {
			response.write(sseEvent({ choices: [{ delta: { content: " E2E" } }] }));
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

async function collectNormalized(response: Response): Promise<{
	text: string;
	model: string | null;
}> {
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
	return { text: parser.text, model: response.headers.get("x-ai-model") };
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
		writingStyle: "Direct, short sentences.",
		writingSample: "Compost happens.",
	});
	const [draft] = await db
		.insert(posts)
		.values({
			userId: OWNER,
			title: "Compost guide",
			slug: "compost-guide",
			status: "draft",
			body: null,
			seoTitle: "",
			description: "",
		})
		.returning({ id: posts.id });
	const postId = draft?.id ?? 0;

	const server = createServer(handleStub);
	await new Promise<void>((resolveListening) => {
		server.listen(0, "127.0.0.1", resolveListening);
	});
	const address = server.address();

	if (!address || typeof address === "string") {
		throw new Error("E2E FAILED: stub server did not bind");
	}

	const baseUrl = `http://127.0.0.1:${address.port}/v1`;

	async function readDraft() {
		return db
			.select({ body: posts.body, status: posts.status })
			.from(posts)
			.where(eq(posts.id, postId))
			.get();
	}

	try {
		// Scenario 1 — success streams profile-steered text, draft untouched.
		mode = "success";
		const validated = generateInputSchema.parse({
			prompt: "Draft an intro.",
			postId,
		});
		const okResponse = await generateDraftStream(
			{ userId: OWNER, ...validated },
			{ db, apiKey: "e2e-key", baseUrl },
		);
		const { text, model } = await collectNormalized(okResponse);
		check("success streams stubbed deltas end-to-end", text === "Hello E2E", text);
		check("model header reports the profile default", model === "google/gemini-2.5-flash", model ?? "null");
		check("request carries the bearer key", lastAuthorization === "Bearer e2e-key", lastAuthorization ?? "null");
		check("system prompt carries writing style", (lastSystemPrompt ?? "").includes("Direct, short sentences."));
		check("system prompt carries writing sample", (lastSystemPrompt ?? "").includes("Compost happens."));
		check("draft row unchanged after success", JSON.stringify(await readDraft()) === JSON.stringify({ body: null, status: "draft" }));

		// Scenario 2 — provider outage maps cleanly, draft intact.
		mode = "outage";
		const outageError = await generateDraftStream(
			{ userId: OWNER, postId, prompt: "Draft an intro." },
			{ db, apiKey: "e2e-key", baseUrl },
		).catch((error: unknown) => error);
		check("outage maps to provider_unavailable", outageError instanceof AiError && outageError.code === "provider_unavailable");
		check("draft row unchanged after outage", JSON.stringify(await readDraft()) === JSON.stringify({ body: null, status: "draft" }));

		// Scenario 3 — missing key never touches the provider.
		mode = "success";
		const before = stubRequests;
		const configError = await generateDraftStream(
			{ userId: OWNER, prompt: "Draft an intro." },
			{ db, baseUrl },
		).catch((error: unknown) => error);
		check("missing key maps to not_configured", configError instanceof AiError && (configError as AiError).code === "not_configured");
		check("no provider request without a key", stubRequests === before);

		// Scenario 4 — mid-stream abort keeps the partial text client-side.
		mode = "hang";
		const abortController = new AbortController();
		const abortResponse = await generateDraftStream(
			{ userId: OWNER, prompt: "Draft an intro.", signal: abortController.signal },
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
		check("draft row unchanged after abort", JSON.stringify(await readDraft()) === JSON.stringify({ body: null, status: "draft" }));

		log(`\nE2E complete: stub saw ${stubRequests} provider request(s). All green.`);
		mkdirSync(dirname(ARTIFACT), { recursive: true });
		writeFileSync(ARTIFACT, `${lines.join("\n")}\n`);
		log(`Artifact: docs/e2e/t5.1-ai-generate.log`);
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
