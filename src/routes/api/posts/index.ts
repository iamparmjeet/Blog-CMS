import { createFileRoute } from "@tanstack/react-router";
import { getDb } from "#/db";
import { handleFeedCollection } from "#/features/feed/feed.server";

export const Route = createFileRoute("/api/posts/")({
	server: {
		handlers: {
			GET: ({ request }) => handleFeedCollection(request, getDb()),
			OPTIONS: ({ request }) => handleFeedCollection(request, getDb()),
		},
	},
});
