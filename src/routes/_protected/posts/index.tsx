import { createFileRoute } from "@tanstack/react-router";
import { listPosts } from "#/features/posts/functions/list-posts.function";
import { PostsPage, type PostTab } from "#/features/posts/pages/posts-page";

const TABS = ["all", "published", "drafts", "deleted"] as const;

export const Route = createFileRoute("/_protected/posts/")({
	validateSearch: (search: Record<string, unknown>): { tab?: PostTab } => {
		const tab = search.tab;

		if (typeof tab === "string" && (TABS as readonly string[]).includes(tab)) {
			return { tab: tab as PostTab };
		}

		return {};
	},
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

	return (
		<PostsPage deletedPosts={deletedPosts} posts={posts} tab={tab ?? "all"} />
	);
}
