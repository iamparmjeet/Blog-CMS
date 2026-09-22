import { and, eq, isNull } from "drizzle-orm";
import type { Db } from "#/db";
import { posts } from "#/db/schema";
import { readOwnerProfile } from "#/features/settings/functions/settings.query";
import { buildChatMessages, resolveModel } from "./ai-prompts";
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

interface PostContext {
	id: number;
	title: string;
}

async function loadPostContext(
	db: Db,
	userId: string,
	postId: number,
): Promise<PostContext> {
	const row = await db
		.select({ id: posts.id, title: posts.title })
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
	const apiKey = deps.apiKey?.trim() || null;

	if (!apiKey) {
		throw new AiError(
			"not_configured",
			"AI generation is not configured. Set OPENROUTER_API_KEY, then retry.",
			503,
		);
	}

	let postContext: PostContext | null = null;

	if (input.postId !== undefined) {
		postContext = await loadPostContext(deps.db, input.userId, input.postId);
	}

	const profile = await readOwnerProfile(deps.db, input.userId);
	const model = resolveModel(profile, input.model);
	const messages = buildChatMessages({
		profile,
		prompt: input.prompt,
		postContext: postContext ? { title: postContext.title } : undefined,
	});

	const baseUrl = (deps.baseUrl?.trim() || OPENROUTER_DEFAULT_BASE_URL).replace(
		/\/$/,
		"",
	);
	const fetchImpl = deps.fetchImpl ?? fetch;

	const upstream = await fetchImpl(`${baseUrl}/chat/completions`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ model, messages, stream: true }),
		signal: input.signal,
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
