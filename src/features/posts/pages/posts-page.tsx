import { NewDraftButton } from "../components/new-draft-button";
import { PostList } from "../components/post-list";
import type { PostListItem } from "../functions/posts.types";

interface PostsPageProps {
	posts: PostListItem[];
}

export function PostsPage({ posts }: PostsPageProps) {
	return (
		<main className="min-h-screen bg-background text-foreground">
			<div className="mx-auto flex max-w-6xl flex-col px-4 sm:px-6 lg:px-8">
				<header className="flex flex-col gap-4 border-border border-b py-5 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h1 className="font-semibold text-2xl tracking-tight">Posts</h1>
					</div>

					<NewDraftButton />
				</header>

				<section aria-label="All posts" className="py-5">
					<PostList posts={posts} />
				</section>
			</div>
		</main>
	);
}
