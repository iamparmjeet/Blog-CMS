import { createFileRoute } from "@tanstack/react-router";
import { getDb } from "#/db";
import { env } from "#/env";
import {
	aiErrorResponse,
	handleRepurposeRequest,
} from "#/features/ai/ai.server";
import { requireSession } from "#/lib/auth/auth.server";

async function handleRepurpose(request: Request): Promise<Response> {
	const session = await requireSession().catch(() => null);

	if (!session) {
		return aiErrorResponse(
			"unauthorized",
			"Sign in as the owner to repurpose.",
			401,
		);
	}

	return handleRepurposeRequest(request, {
		db: getDb(),
		userId: session.user.id,
		apiKey: env.OPENROUTER_API_KEY ?? env.OPENROUTER_KEY ?? null,
		baseUrl: env.OPENROUTER_BASE_URL ?? undefined,
	});
}

export const Route = createFileRoute("/api/ai/repurpose")({
	server: {
		handlers: {
			POST: ({ request }) => handleRepurpose(request),
		},
	},
});
