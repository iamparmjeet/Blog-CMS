import { createServerFn } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";
import { requireSession } from "#/lib/auth/auth.server";
import { listPostsInputSchema } from "./posts.query";
import { readDeletedPostsByOwner, readPostsByOwner } from "./posts.server";

export const listPosts = createServerFn({ method: "GET" })
	.validator(listPostsInputSchema)
	.handler(async ({ data }) => {
		const session = await requireSession();

		setResponseHeaders(
			new Headers({
				"Cache-Control": "no-store",
				Vary: "Cookie, Authorization",
			}),
		);

		const userId = session.user.id;
		const [posts, deletedPosts] = await Promise.all([
			readPostsByOwner({ userId, query: data.query }),
			readDeletedPostsByOwner({ userId, query: data.query }),
		]);

		return { posts, deletedPosts };
	});
