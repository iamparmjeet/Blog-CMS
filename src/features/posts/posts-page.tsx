import { NewDraftButton } from "./components/new-draft-button";
import { PostList } from "./components/post-list";
import type { PostListItem } from "./functions/posts.types";

interface PostsPageProps {
	posts: PostListItem[];
}

export function PostsPage({ posts }: PostsPageProps) {
	return (
		<main className="min-h-screen bg-background text-foreground">
			<div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
				<header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<p className="mb-2 font-medium text-muted-foreground text-sm">
							Posts
						</p>
						<h1 className="font-semibold text-3xl tracking-tight">
							Your posts
						</h1>
						<p className="mt-2 text-muted-foreground text-sm">
							Drafts and published posts live here. Start a draft to begin
							writing.
						</p>
					</div>

					<NewDraftButton />
				</header>

				<section
					aria-label="All posts"
					className="rounded-xl border border-border bg-card p-6 shadow-sm"
				>
					<PostList posts={posts} />
				</section>
			</div>
		</main>
	);
}
