import { createServerFn } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";
import { requireSession } from "#/lib/auth/auth.server";
import { readPostsByOwner } from "./posts.server";

export const listPosts = createServerFn({ method: "GET" }).handler(async () => {
	const session = await requireSession();

	setResponseHeaders(
		new Headers({
			"Cache-Control": "no-store",
			Vary: "Cookie, Authorization",
		}),
	);

	return readPostsByOwner({
		userId: session.user.id,
	});
});
