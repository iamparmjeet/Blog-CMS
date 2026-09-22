import { createServerFn } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";
import { requireSession } from "#/lib/auth/auth.server";
import { readAnalyticsDisplay } from "./analytics.server";

export const getAnalyticsDisplay = createServerFn({ method: "GET" }).handler(
	async () => {
		const session = await requireSession();

		setResponseHeaders(
			new Headers({
				"Cache-Control": "no-store",
				Vary: "Cookie, Authorization",
			}),
		);

		return readAnalyticsDisplay(session.user.id);
	},
);
