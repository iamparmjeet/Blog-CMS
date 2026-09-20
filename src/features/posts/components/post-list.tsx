import { IconFileText } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { StatusBadge } from "#/features/dashboard/components/status-badge";
import { formatDate } from "#/lib/date";
import { formatNumber } from "#/lib/number";
import type { PostListItem } from "../functions/posts.types";

interface PostListProps {
	posts: PostListItem[];
}

export function PostList({ posts }: PostListProps) {
	if (posts.length === 0) {
		return <NoPostYet />;
	}

	return (
		<div className="border-border border-t">
			<div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-4 border-border border-b px-4 py-3 text-muted-foreground text-xs uppercase tracking-[0.14em] sm:px-6">
				<span>Title</span>
				<span>Status</span>
				<span className="text-right">Updated</span>
			</div>
			<ul className="divide-y divide-border">
				{posts.map((post) => (
					<ListPost key={post.id} post={post} />
				))}
			</ul>
		</div>
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
		<Link
			to="/posts/$postId"
			params={{ postId: String(post.id) }}
			key={post.id}
			className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 px-4 py-4 transition-colors hover:bg-muted/40 sm:px-6"
		>
			<div className="min-w-0">
				<p className="truncate font-medium">{post.title}</p>

				<p className="mt-1 flex flex-wrap items-center gap-x-1 text-muted-foreground text-xs">
					<span className="truncate font-mono">/{post.slug}</span>
					<span aria-hidden="true">·</span>
					<span>{formatNumber(post.wordCount)} words</span>
				</p>
			</div>

			<StatusBadge status={post.status} />
			<time
				className="text-right text-muted-foreground text-sm"
				dateTime={post.updatedAt}
			>
				{formatDate(post.updatedAt)}
			</time>
		</Link>
	);
}
