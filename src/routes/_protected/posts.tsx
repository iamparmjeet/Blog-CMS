import { createFileRoute } from "@tanstack/react-router";
import { listPosts } from "#/features/posts/functions/list-posts.function";
import { PostsPage } from "#/features/posts/posts-page";

export const Route = createFileRoute("/_protected/posts")({
	loader: () => listPosts(),
	head: () => ({
		meta: [
			{
				title: "Posts · ContentOS",
			},
		],
	}),
	component: PostsRoute,
});

function PostsRoute() {
	const posts = Route.useLoaderData();
	return <PostsPage posts={posts} />;
}
