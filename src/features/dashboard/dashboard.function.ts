import { createServerFn } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";
import { requireSession } from "#/lib/auth/auth.server";

export const getDashboardData = createServerFn({ method: "GET" }).handler(
	async () => {
		const session = await requireSession();

		setResponseHeaders(
			new Headers({
				"Cache-Control": "no-store",
				Vary: "Cookie, Authorization",
			}),
		);

		/*
		The important rule is that the user ID comes from the
		validated session—not from browser input.
		*/

		return {
			viewerId: session.user.id,
			welcomeMessage: `Welcome back, ${session.user.name}`,
		};
	},
);
