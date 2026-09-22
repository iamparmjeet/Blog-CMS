import { createFileRoute } from "@tanstack/react-router";
import { handleFeedCollection } from "#/features/feed/feed.server";

export const Route = createFileRoute("/api/posts/")({
	server: {
		handlers: {
			GET: ({ request }) => handleFeedCollection(request),
			OPTIONS: ({ request }) => handleFeedCollection(request),
		},
	},
});
