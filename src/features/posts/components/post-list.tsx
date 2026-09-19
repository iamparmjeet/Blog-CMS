import { IconFileText } from "@tabler/icons-react";
import { StatusBadge } from "#/features/dashboard/components/status-badge";
import { formatDate } from "#/lib/date";
import { formatNumber } from "#/lib/number";
import type { PostListItem } from "../functions/posts.types";

interface PostListProps {
	posts: PostListItem[];
}

export function PostList({ posts }: PostListProps) {
	if (posts.length === 0) <NoPostYet />;

	return (
		<ul className="divide-y divide-border">
			{posts.map((post) => (
				<ListPost key={post.id} post={post} />
			))}
		</ul>
	);
}

//  ************ Post components *************
function NoPostYet() {
	return (
		<div className="rounded-lg border border-border border-dashed p-10 text-center">
			<IconFileText
				aria-hidden="true"
				className="mx-auto size-8 text-muted-foreground"
			/>
			<p className="mt-3 font-medium">No posts yet</p>
			<p className="mt-1 text-muted-foreground text-sm">
				Create your first draft to start writing.
			</p>
		</div>
	);
}

function ListPost({ post }: { post: PostListItem }) {
	return (
		<li
			key={post.id}
			className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
		>
			<div className="min-w-0">
				<p className="truncate font-medium">{post.title}</p>

				<p className="mt-1 flex flex-wrap items-center gap-x-1 text-muted-foreground text-sm">
					<span className="truncate font-mono text-xs">/{post.slug}</span>
					<span aria-hidden="true">·</span>
					<span>{formatNumber(post.wordCount)} words</span>
					<span aria-hidden="true">·</span>
					<time dateTime={post.updatedAt}>{formatDate(post.updatedAt)}</time>
				</p>
			</div>

			<StatusBadge status={post.status} />
		</li>
	);
}
