import { createFileRoute } from "@tanstack/react-router";
import { getDb } from "#/db";
import { handleFeedPost } from "#/features/feed/feed.server";

export const Route = createFileRoute("/api/posts/$slug")({
	server: {
		handlers: {
			GET: ({ request, params }) =>
				handleFeedPost(request, params.slug, getDb()),
			OPTIONS: ({ request, params }) =>
				handleFeedPost(request, params.slug, getDb()),
		},
	},
});
