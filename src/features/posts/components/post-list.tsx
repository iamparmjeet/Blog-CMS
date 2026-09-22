import { IconChevronRight, IconFileText } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { StatusBadge } from "#/components/content-os/ui";
import { formatDate } from "#/lib/date";
import { cn } from "#/lib/utils";
import type { PostListItem } from "../functions/posts.types";

interface PostListProps {
	canOpenPosts: boolean;
	emptyDescription: string;
	emptyTitle: string;
	onSelectedPostIdsChange: (postIds: number[]) => void;
	posts: PostListItem[];
	selectedPostIds: ReadonlySet<number>;
}

const ROW_GRID =
	"grid grid-cols-[32px_minmax(0,1fr)_110px_110px_40px] items-center gap-3 px-8";

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
			<div className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
				<div className="flex size-12 items-center justify-center rounded-[10px] border border-border bg-flat-surface text-text-dim">
					<IconFileText aria-hidden="true" className="size-5" />
				</div>
				<p className="mt-4 font-medium text-sm text-text-primary">
					{emptyTitle}
				</p>
				<p className="mt-1 max-w-[38ch] text-text-muted text-xs leading-relaxed">
					{emptyDescription}
				</p>
			</div>
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
		<div className="flex min-h-0 flex-1 flex-col overflow-x-auto">
			<div className="flex min-h-0 w-full min-w-[680px] flex-1 flex-col">
				<div
					className={cn(
						ROW_GRID,
						"border-border-subtle border-b py-2 font-medium text-[10px] text-text-dim uppercase tracking-[0.04em]",
					)}
				>
					<input
						aria-label="Select all posts"
						checked={allPostsSelected}
						className="size-3.5 accent-brand"
						onChange={(event) => toggleAllPosts(event.target.checked)}
						type="checkbox"
					/>
					<span>Title</span>
					<span>Status</span>
					<span>Updated</span>
					<span />
				</div>

				<ul>
					{posts.map((post) => (
						<PostRow
							canOpenPost={canOpenPosts}
							key={post.id}
							onSelectedChange={(selected) => togglePost(post.id, selected)}
							post={post}
							selected={selectedPostIds.has(post.id)}
						/>
					))}
				</ul>
			</div>
		</div>
	);
}

function PostRow({
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
	const summary = (
		<>
			<span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-flat-surface text-text-muted">
				<IconFileText aria-hidden="true" className="size-3.5" />
			</span>
			<span className="min-w-0">
				<span className="block truncate font-medium text-[13px] text-text-body">
					{post.title}
				</span>
				<span className="mt-0.5 block truncate font-mono text-[11px] text-text-muted">
					/{post.slug}
				</span>
			</span>
		</>
	);

	return (
		<li
			className={cn(
				ROW_GRID,
				"border-border-dim border-b py-2.5 transition-colors",
				selected ? "bg-brand/5" : "hover:bg-white/[0.02]",
			)}
		>
			<input
				aria-label={`Select ${post.title}`}
				checked={selected}
				className="size-3.5 accent-brand"
				onChange={(event) => onSelectedChange(event.target.checked)}
				type="checkbox"
			/>

			{canOpenPost ? (
				<Link
					className="flex min-w-0 items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					params={{ postId: String(post.id) }}
					to="/posts/$postId"
				>
					{summary}
				</Link>
			) : (
				<span className="flex min-w-0 items-center gap-3">{summary}</span>
			)}

			<StatusBadge status={post.status} />

			<span className="text-[11px] text-text-muted tabular-nums">
				{formatDate(post.updatedAt)}
			</span>

			{canOpenPost ? (
				<Link
					aria-label={`Open ${post.title}`}
					className="flex justify-end text-text-faint transition-colors hover:text-text-secondary"
					params={{ postId: String(post.id) }}
					to="/posts/$postId"
				>
					<IconChevronRight aria-hidden="true" className="size-3.5" />
				</Link>
			) : (
				<span aria-hidden="true" />
			)}
		</li>
	);
}
