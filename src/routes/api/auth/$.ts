import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/lib/auth/auth";
import { redirectClaimedInstanceCallback } from "#/lib/auth/callback-error";

export const Route = createFileRoute("/api/auth/$")({
	server: {
		handlers: {
			GET: async ({ request }) =>
				redirectClaimedInstanceCallback(request, await auth.handler(request)),
			POST: ({ request }) => auth.handler(request),
		},
	},
});
