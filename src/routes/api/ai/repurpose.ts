import { createFileRoute } from "@tanstack/react-router";
import { getDb } from "#/db";
import { env } from "#/env";
import { AiError, repurposePostStream } from "#/features/ai/ai.server";
import { repurposeInputSchema } from "#/features/ai/ai-repurpose";
import { requireSession } from "#/lib/auth/auth.server";

function jsonError(code: string, message: string, status: number): Response {
	return new Response(JSON.stringify({ error: { code, message } }), {
		status,
		headers: {
			"content-type": "application/json",
			"cache-control": "no-store",
		},
	});
}

async function handleRepurpose(request: Request): Promise<Response> {
	const session = await requireSession().catch(() => null);

	if (!session) {
		return jsonError("unauthorized", "Sign in as the owner to repurpose.", 401);
	}

	let raw: unknown;

	try {
		raw = await request.json();
	} catch {
		return jsonError("invalid_request", "The request body must be JSON.", 400);
	}

	const parsed = repurposeInputSchema.safeParse(raw);

	if (!parsed.success) {
		return jsonError(
			"invalid_request",
			"Provide a postId and one of twitter, linkedin, instagram, reels.",
			400,
		);
	}

	try {
		return await repurposePostStream(
			{
				userId: session.user.id,
				postId: parsed.data.postId,
				platform: parsed.data.platform,
				model: parsed.data.model,
			},
			{
				db: getDb(),
				apiKey: env.OPENROUTER_API_KEY ?? env.OPENROUTER_KEY ?? null,
				baseUrl: env.OPENROUTER_BASE_URL ?? undefined,
			},
		);
	} catch (error) {
		if (error instanceof AiError) {
			return jsonError(error.code, error.message, error.status);
		}

		if (error instanceof Error && error.message === "Post not found") {
			return jsonError("not_found", "Post not found.", 404);
		}

		throw error;
	}
}

export const Route = createFileRoute("/api/ai/repurpose")({
	server: {
		handlers: {
			POST: ({ request }) => handleRepurpose(request),
		},
	},
});
