import { IconChevronRight, IconFileText } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { StatusBadge } from "#/components/content-os/ui";
import { formatDate } from "#/lib/date";
import type { DashboardData } from "../functions/dashboard.types";
import { SectionLabel } from "./label";

interface RecentPostsProps {
	posts: DashboardData["recentPosts"];
}

export function RecentPosts({ posts }: RecentPostsProps) {
	return (
		<section aria-label="Recent posts">
			<SectionLabel>Recent posts</SectionLabel>

			{posts.length === 0 ? (
				<p className="mt-4 text-text-muted text-xs">
					Your most recently updated posts will appear here.
				</p>
			) : (
				<ul className="mt-2">
					{posts.map((post) => (
						<li key={post.id}>
							<Link
								className="flex items-center gap-3 border-border-dim border-b px-1 py-2.5 transition-colors last:border-b-0 hover:bg-white/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
								params={{ postId: String(post.id) }}
								to="/posts/$postId"
							>
								<span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-card text-text-muted">
									<IconFileText aria-hidden="true" className="size-3.5" />
								</span>
								<span className="min-w-0 flex-1 truncate font-medium text-[13px] text-text-body">
									{post.title}
								</span>
								<StatusBadge status={post.status} />
								<span className="w-24 shrink-0 text-right text-[11px] text-text-muted">
									{formatDate(post.updatedAt)}
								</span>
							</Link>
						</li>
					))}
				</ul>
			)}

			<Link
				className="mt-3 inline-flex items-center gap-1 text-[11px] text-text-muted transition-colors hover:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				to="/posts"
			>
				View all posts
				<IconChevronRight aria-hidden="true" className="size-3" />
			</Link>
		</section>
	);
}
