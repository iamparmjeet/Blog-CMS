import { createFileRoute } from "@tanstack/react-router";
import { getDb } from "#/db";
import { handleRssFeed } from "#/features/feed/rss.server";

export const Route = createFileRoute("/rss")({
	server: {
		handlers: {
			GET: ({ request }) => handleRssFeed(request, getDb()),
		},
	},
});
