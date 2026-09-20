import { createServerFn } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";
import { requireSession } from "#/lib/auth/auth.server";
import { readDeletedPostsByOwner, readPostsByOwner } from "./posts.server";

export const listPosts = createServerFn({ method: "GET" }).handler(async () => {
	const session = await requireSession();

	setResponseHeaders(
		new Headers({
			"Cache-Control": "no-store",
			Vary: "Cookie, Authorization",
		}),
	);

	const userId = session.user.id;
	const [posts, deletedPosts] = await Promise.all([
		readPostsByOwner({ userId }),
		readDeletedPostsByOwner({ userId }),
	]);

	return { posts, deletedPosts };
});
