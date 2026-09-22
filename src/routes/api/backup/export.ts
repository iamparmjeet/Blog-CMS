import { env } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";
import { getDb } from "#/db";
import { handleExportRequest } from "#/features/backup/backup-export.server";
import { requireSession } from "#/lib/auth/auth.server";

async function handleExport(): Promise<Response> {
	const session = await requireSession().catch(() => null);

	if (!session) {
		return Response.json(
			{ error: { code: "unauthorized", message: "Sign in as the owner." } },
			{ status: 401 },
		);
	}

	return handleExportRequest({
		db: getDb(),
		userId: session.user.id,
		readObject: async (key) => {
			const object = await env.MEDIA.get(key);

			if (!object) return null;

			const buffer = await object.arrayBuffer();

			return {
				contentType:
					object.httpMetadata?.contentType ?? "application/octet-stream",
				bytes: new Uint8Array(buffer),
			};
		},
	});
}

export const Route = createFileRoute("/api/backup/export")({
	server: {
		handlers: {
			GET: () => handleExport(),
		},
	},
});
