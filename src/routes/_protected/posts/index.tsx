import { createFileRoute } from "@tanstack/react-router";
import { listPosts } from "#/features/posts/functions/list-posts.function";
import { PostsPage, type PostTab } from "#/features/posts/pages/posts-page";

const TABS = ["all", "published", "drafts", "deleted"] as const;

export const Route = createFileRoute("/_protected/posts/")({
	validateSearch: (
		search: Record<string, unknown>,
	): {
		tab?: PostTab;
		q?: string;
	} => {
		const tab = search.tab;
		const query =
			typeof search.q === "string" ? search.q.trim().slice(0, 64) : "";

		return {
			...(typeof tab === "string" && (TABS as readonly string[]).includes(tab)
				? { tab: tab as PostTab }
				: {}),
			...(query ? { q: query } : {}),
		};
	},
	loaderDeps: ({ search }) => ({ q: search.q }),
	loader: ({ deps }) => listPosts({ data: { query: deps.q } }),
	head: () => ({
		meta: [
			{
				title: "Posts · PageOwl",
			},
		],
	}),
	component: PostsRoute,
});

function PostsRoute() {
	const { posts, deletedPosts } = Route.useLoaderData();
	const { tab, q } = Route.useSearch();

	return (
		<PostsPage
			deletedPosts={deletedPosts}
			posts={posts}
			query={q ?? ""}
			tab={tab ?? "all"}
		/>
	);
}
