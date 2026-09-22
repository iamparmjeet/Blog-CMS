import { and, eq, isNull } from "drizzle-orm";
import type { Db } from "#/db";
import { posts } from "#/db/schema";
import {
	extractPlainText,
	parseStoredPostBody,
} from "#/features/posts/functions/post-body";
import { readOwnerProfile } from "#/features/settings/functions/settings.query";
import { buildChatMessages, resolveModel } from "./ai-prompts";
import { buildRepurposeMessages, type RepurposePlatform } from "./ai-repurpose";
import { createSseParser, mapProviderError } from "./ai-stream";

export const OPENROUTER_DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";

export class AiError extends Error {
	code: string;
	status: number;

	constructor(code: string, message: string, status: number) {
		super(message);
		this.name = "AiError";
		this.code = code;
		this.status = status;
	}
}

export interface GenerateDraftInput {
	userId: string;
	postId?: number;
	prompt: string;
	model?: string;
	signal?: AbortSignal;
}

export interface GenerateDraftDeps {
	db: Db;
	fetchImpl?: typeof fetch;
	baseUrl?: string;
	apiKey?: string | null;
}

export interface RepurposePostInput {
	userId: string;
	postId: number;
	platform: RepurposePlatform;
	model?: string;
	signal?: AbortSignal;
}

interface PostContext {
	id: number;
	title: string;
}

interface SourcePost extends PostContext {
	body: string | null;
}

async function loadSourcePost(
	db: Db,
	userId: string,
	postId: number,
): Promise<SourcePost> {
	const row = await db
		.select({ id: posts.id, title: posts.title, body: posts.body })
		.from(posts)
		.where(
			and(
				eq(posts.id, postId),
				eq(posts.userId, userId),
				isNull(posts.deletedAt),
			),
		)
		.get();

	if (!row) {
		throw new Error("Post not found");
	}

	return row;
}

function resolveApiKey(apiKey: string | null | undefined): string {
	const trimmed = apiKey?.trim() || null;

	if (!trimmed) {
		throw new AiError(
			"not_configured",
			"AI generation is not configured. Set OPENROUTER_API_KEY, then retry.",
			503,
		);
	}

	return trimmed;
}

async function streamChatCompletion({
	model,
	messages,
	apiKey,
	baseUrl,
	fetchImpl,
	signal,
}: {
	model: string;
	messages: Array<{ role: string; content: string }>;
	apiKey: string;
	baseUrl?: string;
	fetchImpl?: typeof fetch;
	signal?: AbortSignal;
}): Promise<Response> {
	const base = (baseUrl?.trim() || OPENROUTER_DEFAULT_BASE_URL).replace(
		/\/$/,
		"",
	);
	const runFetch = fetchImpl ?? fetch;

	const upstream = await runFetch(`${base}/chat/completions`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ model, messages, stream: true }),
		signal,
	});

	if (!upstream.ok || !upstream.body) {
		const bodyText = !upstream.ok ? await upstream.text().catch(() => "") : "";
		const mapped = upstream.ok
			? {
					code: "stream_error",
					message: "OpenRouter returned an empty stream.",
					status: 502,
				}
			: mapProviderError(upstream.status, bodyText);

		throw new AiError(mapped.code, mapped.message, mapped.status);
	}

	return new Response(toNormalizedStream(upstream.body), {
		status: 200,
		headers: {
			"content-type": "text/event-stream",
			"cache-control": "no-store",
			"x-ai-model": model,
		},
	});
}

function toNormalizedStream(
	upstreamBody: ReadableStream<Uint8Array>,
): ReadableStream<Uint8Array> {
	const parser = createSseParser();
	const encoder = new TextEncoder();
	const decoder = new TextDecoder();
	let emitted = 0;

	return new ReadableStream<Uint8Array>({
		async start(controller) {
			const reader = upstreamBody.getReader();

			try {
				for (;;) {
					const { done, value } = await reader.read();

					if (done) {
						break;
					}

					parser.feed(decoder.decode(value, { stream: true }));

					for (; emitted < parser.deltas.length; emitted += 1) {
						controller.enqueue(
							encoder.encode(
								`data: ${JSON.stringify({ delta: parser.deltas[emitted] })}\n\n`,
							),
						);
					}

					if (parser.error) {
						controller.enqueue(
							encoder.encode(
								`data: ${JSON.stringify({ error: { message: parser.error } })}\n\n`,
							),
						);
						break;
					}

					if (parser.done) {
						break;
					}
				}

				parser.flush();

				for (; emitted < parser.deltas.length; emitted += 1) {
					controller.enqueue(
						encoder.encode(
							`data: ${JSON.stringify({ delta: parser.deltas[emitted] })}\n\n`,
						),
					);
				}

				controller.enqueue(encoder.encode("data: [DONE]\n\n"));
				controller.close();
			} catch (error) {
				controller.error(error);
			} finally {
				reader.releaseLock();
			}
		},
	});
}

/**
 * Streams a draft completion from OpenRouter without touching the post:
 * generation never writes to the database, so provider failures, aborts,
 * and cancellations always leave the draft intact. The caller inserts the
 * streamed text into the editor only through an explicit owner action.
 */
export async function generateDraftStream(
	input: GenerateDraftInput,
	deps: GenerateDraftDeps,
): Promise<Response> {
	const apiKey = resolveApiKey(deps.apiKey);

	let postContext: PostContext | null = null;

	if (input.postId !== undefined) {
		postContext = await loadSourcePost(deps.db, input.userId, input.postId);
	}

	const profile = await readOwnerProfile(deps.db, input.userId);
	const model = resolveModel(profile, input.model);
	const messages = buildChatMessages({
		profile,
		prompt: input.prompt,
		postContext: postContext ? { title: postContext.title } : undefined,
	});

	return streamChatCompletion({
		model,
		messages,
		apiKey,
		baseUrl: deps.baseUrl,
		fetchImpl: deps.fetchImpl,
		signal: input.signal,
	});
}

/**
 * Streams a social-format variant of an existing post without touching it:
 * repurposing is read-only on the source, so failures and aborts leave the
 * post intact. The owner copies the variant through an explicit UI action.
 */
export async function repurposePostStream(
	input: RepurposePostInput,
	deps: GenerateDraftDeps,
): Promise<Response> {
	const apiKey = resolveApiKey(deps.apiKey);
	const source = await loadSourcePost(deps.db, input.userId, input.postId);
	const sourceText = extractPlainText(parseStoredPostBody(source.body)).trim();

	if (!sourceText) {
		throw new AiError(
			"empty_source",
			"This post has no text to repurpose yet. Write something first, then retry.",
			422,
		);
	}

	const profile = await readOwnerProfile(deps.db, input.userId);
	const model = resolveModel(profile, input.model);
	const messages = buildRepurposeMessages({
		profile,
		platform: input.platform,
		title: source.title,
		sourceText,
	});

	return streamChatCompletion({
		model,
		messages,
		apiKey,
		baseUrl: deps.baseUrl,
		fetchImpl: deps.fetchImpl,
		signal: input.signal,
	});
}
