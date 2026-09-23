import { env } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";
import { getDb } from "#/db";
import {
	handleChunkedCancel,
	handleChunkedFinish,
	handleChunkedObject,
} from "#/features/backup/backup-chunked.server";
import { requireSession } from "#/lib/auth/auth.server";

async function handleSession(
	request: Request,
	action: "object" | "finish" | "cancel",
): Promise<Response> {
	const session = await requireSession().catch(() => null);
	if (!session)
		return Response.json(
			{ error: { code: "unauthorized", message: "Sign in as the owner." } },
			{ status: 401 },
		);
	const deps = {
		db: getDb(),
		userId: session.user.id,
		publicUrl: env.R2_PUBLIC_URL ?? "",
		putObject: async () => {
			throw new Error("Not used by chunked restore");
		},
		deleteObjects: async (keys: string[]) => {
			for (let i = 0; i < keys.length; i += 1000)
				await env.MEDIA.delete(keys.slice(i, i + 1000));
		},
		writeStream: async (
			key: string,
			stream: ReadableStream<Uint8Array>,
			contentType: string,
		) => {
			const result = await env.MEDIA.put(key, stream, {
				onlyIf: { etagDoesNotMatch: "*" },
				httpMetadata: {
					contentType,
					cacheControl: "public, max-age=31536000, immutable",
				},
			});
			if (!result)
				throw new Error("Restore object already staged; start a new session.");
		},
		headObject: async (key: string) => {
			const object = await env.MEDIA.head(key);
			return object
				? {
						size: object.size,
						contentType: object.httpMetadata?.contentType ?? null,
					}
				: null;
		},
		listStagedKeys: async (prefix: string) => {
			const keys: string[] = [];
			let cursor: string | undefined;
			do {
				const page = await env.MEDIA.list({ prefix, cursor });
				keys.push(...page.objects.map((object) => object.key));
				cursor = page.truncated ? page.cursor : undefined;
			} while (cursor);
			return keys;
		},
	};
	return action === "object"
		? handleChunkedObject(request, deps)
		: action === "cancel"
			? handleChunkedCancel(request, deps)
			: handleChunkedFinish(request, deps);
}

export const Route = createFileRoute("/api/backup/session")({
	server: {
		handlers: {
			PUT: ({ request }) => handleSession(request, "object"),
			POST: ({ request }) => handleSession(request, "finish"),
			DELETE: ({ request }) => handleSession(request, "cancel"),
		},
	},
});
