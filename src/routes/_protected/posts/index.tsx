import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { listPosts } from "#/features/posts/functions/list-posts.function";
import { PostsPage } from "#/features/posts/pages/posts-page";

const postsSearchSchema = z.object({
	tab: z.enum(["all", "published", "drafts", "deleted"]).catch("all"),
});

export const Route = createFileRoute("/_protected/posts/")({
	validateSearch: (search: Record<string, unknown>) =>
		postsSearchSchema.parse(search),
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
	const { tab } = Route.useSearch();

	return <PostsPage deletedPosts={deletedPosts} posts={posts} tab={tab} />;
}
