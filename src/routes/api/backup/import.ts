import { env } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";
import { getDb } from "#/db";
import { handleImportRequest } from "#/features/backup/backup-import.server";
import { requireSession } from "#/lib/auth/auth.server";

async function handleImport(request: Request): Promise<Response> {
	const session = await requireSession().catch(() => null);
	if (!session) {
		return Response.json(
			{ error: { code: "unauthorized", message: "Sign in as the owner." } },
			{ status: 401 },
		);
	}
	return handleImportRequest(request, {
		db: getDb(),
		userId: session.user.id,
		publicUrl: env.R2_PUBLIC_URL ?? "",
		putObject: async (key, bytes, contentType) => {
			await env.MEDIA.put(key, bytes, {
				httpMetadata: {
					contentType,
					cacheControl: "public, max-age=31536000, immutable",
				},
			});
		},
		deleteObjects: async (keys) => {
			for (let i = 0; i < keys.length; i += 1000) {
				await env.MEDIA.delete(keys.slice(i, i + 1000));
			}
		},
	});
}

export const Route = createFileRoute("/api/backup/import")({
	server: { handlers: { POST: ({ request }) => handleImport(request) } },
});
