import { IconChevronRight, IconFileText } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { StatusBadge } from "#/components/content-os/ui";
import { formatDate } from "#/lib/date";
import type { DashboardData } from "../functions/dashboard.types";
import { SectionLabel } from "./label";

interface RecentPostsProps {
	onOpenPost?: (postId: number) => void;
	onViewAll?: () => void;
	posts: DashboardData["recentPosts"];
}

const rowClassName =
	"flex w-full items-center gap-3 border-border-subtle border-b px-1 py-3 text-left transition-colors last:border-b-0 hover:bg-white/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function RecentPosts({
	onOpenPost,
	onViewAll,
	posts,
}: RecentPostsProps) {
	const rowBody = (post: DashboardData["recentPosts"][number]) => (
		<>
			<span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-flat-surface text-text-muted">
				<IconFileText aria-hidden="true" className="size-3.5" />
			</span>
			<span className="min-w-0 flex-1 truncate font-medium text-[13px] text-text-body">
				{post.title}
			</span>
			<StatusBadge status={post.status} />
			<span className="hidden w-24 shrink-0 text-right text-[11px] text-text-muted sm:block">
				{formatDate(post.updatedAt)}
			</span>
		</>
	);

	return (
		<section aria-label="Recent posts">
			<SectionLabel>Recent posts</SectionLabel>

			{posts.length === 0 ? (
				<p className="mt-4 text-text-muted text-xs">
					Your most recently updated posts will appear here.
				</p>
			) : (
				<ul className="mt-3">
					{posts.map((post) => (
						<li key={post.id}>
							{onOpenPost ? (
								<button
									className={rowClassName}
									onClick={() => onOpenPost(post.id)}
									type="button"
								>
									{rowBody(post)}
								</button>
							) : (
								<Link
									className={rowClassName}
									params={{ postId: String(post.id) }}
									to="/posts/$postId"
								>
									{rowBody(post)}
								</Link>
							)}
						</li>
					))}
				</ul>
			)}

			{onViewAll ? (
				<button
					className="mt-3 inline-flex items-center gap-1 text-[11px] text-text-muted transition-colors hover:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					onClick={onViewAll}
					type="button"
				>
					View all posts
					<IconChevronRight aria-hidden="true" className="size-3" />
				</button>
			) : (
				<Link
					className="mt-3 inline-flex items-center gap-1 text-[11px] text-text-muted transition-colors hover:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					to="/posts"
				>
					View all posts
					<IconChevronRight aria-hidden="true" className="size-3" />
				</Link>
			)}
		</section>
	);
}
