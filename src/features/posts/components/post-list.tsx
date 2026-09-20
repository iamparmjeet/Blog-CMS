import { IconFileText } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { StatusBadge } from "#/features/dashboard/components/status-badge";
import { formatDate } from "#/lib/date";
import { formatNumber } from "#/lib/number";
import type { PostListItem } from "../functions/posts.types";

interface PostListProps {
	canOpenPosts: boolean;
	emptyDescription: string;
	emptyTitle: string;
	onSelectedPostIdsChange: (postIds: number[]) => void;
	posts: PostListItem[];
	selectedPostIds: ReadonlySet<number>;
}

export function PostList({
	canOpenPosts,
	emptyDescription,
	emptyTitle,
	onSelectedPostIdsChange,
	posts,
	selectedPostIds,
}: PostListProps) {
	if (posts.length === 0) {
		return (
			<NoPosts emptyDescription={emptyDescription} emptyTitle={emptyTitle} />
		);
	}

	const allPostsSelected = posts.every((post) => selectedPostIds.has(post.id));

	function togglePost(postId: number, selected: boolean) {
		const nextSelectedPostIds = new Set(selectedPostIds);

		if (selected) {
			nextSelectedPostIds.add(postId);
		} else {
			nextSelectedPostIds.delete(postId);
		}

		onSelectedPostIdsChange([...nextSelectedPostIds]);
	}

	function toggleAllPosts(selected: boolean) {
		onSelectedPostIdsChange(selected ? posts.map((post) => post.id) : []);
	}

	return (
		<div className="border-border border-t">
			<div className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] gap-4 border-border border-b px-4 py-3 text-muted-foreground text-xs uppercase tracking-[0.14em] sm:px-6">
				<input
					aria-label="Select all posts"
					checked={allPostsSelected}
					type="checkbox"
					onChange={(event) => toggleAllPosts(event.target.checked)}
				/>
				<span>Title</span>
				<span>Status</span>
				<span className="text-right">Updated</span>
			</div>
			<ul className="divide-y divide-border">
				{posts.map((post) => (
					<ListPost
						key={post.id}
						post={post}
						selected={selectedPostIds.has(post.id)}
						canOpenPost={canOpenPosts}
						onSelectedChange={(selected) => togglePost(post.id, selected)}
					/>
				))}
			</ul>
		</div>
	);
}

//  ************ Post components *************
function NoPosts({
	emptyDescription,
	emptyTitle,
}: Pick<PostListProps, "emptyDescription" | "emptyTitle">) {
	return (
		<div className="rounded-lg border border-border border-dashed p-10 text-center">
			<IconFileText
				aria-hidden="true"
				className="mx-auto size-8 text-muted-foreground"
			/>
			<p className="mt-3 font-medium">{emptyTitle}</p>
			<p className="mt-1 text-muted-foreground text-sm">{emptyDescription}</p>
		</div>
	);
}

function ListPost({
	canOpenPost,
	onSelectedChange,
	post,
	selected,
}: {
	canOpenPost: boolean;
	onSelectedChange: (selected: boolean) => void;
	post: PostListItem;
	selected: boolean;
}) {
	return (
		<li className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-4 px-4 py-4 transition-colors hover:bg-muted/40 sm:px-6">
			<input
				aria-label={`Select ${post.title}`}
				checked={selected}
				type="checkbox"
				onChange={(event) => onSelectedChange(event.target.checked)}
			/>
			{canOpenPost ? (
				<Link
					to="/posts/$postId"
					params={{ postId: String(post.id) }}
					className="min-w-0"
				>
					<PostSummary post={post} />
				</Link>
			) : (
				<PostSummary post={post} />
			)}

			<StatusBadge status={post.status} />
			<time
				className="text-right text-muted-foreground text-sm"
				dateTime={post.updatedAt}
			>
				{formatDate(post.updatedAt)}
			</time>
		</li>
	);
}

function PostSummary({ post }: { post: PostListItem }) {
	return (
		<div className="min-w-0">
			<p className="truncate font-medium">{post.title}</p>

			<p className="mt-1 flex flex-wrap items-center gap-x-1 text-muted-foreground text-xs">
				<span className="truncate font-mono">/{post.slug}</span>
				<span aria-hidden="true">·</span>
				<span>{formatNumber(post.wordCount)} words</span>
			</p>
		</div>
	);
}
