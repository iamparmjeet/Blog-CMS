import { createFileRoute } from "@tanstack/react-router";
import { listPosts } from "#/features/posts/functions/list-posts.function";
import { PostsPage } from "#/features/posts/pages/posts-page";

export const Route = createFileRoute("/_protected/posts/")({
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
	const { posts, deletedPosts } = Route.useLoaderData();

	return <PostsPage deletedPosts={deletedPosts} posts={posts} />;
}
