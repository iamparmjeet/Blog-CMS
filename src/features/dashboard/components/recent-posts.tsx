import { IconChevronRight, IconFileText } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { formatDate } from "#/lib/date";
import { formatNumber } from "#/lib/number";
import type { DashboardData } from "../functions/dashboard.types";
import { SectionLabel } from "./label";
import { StatusBadge } from "./status-badge";

interface RecentPostsProps {
	posts: DashboardData["recentPosts"];
}

export function RecentPosts({ posts }: RecentPostsProps) {
	return (
		<section
			aria-labelledby="recent-posts-heading"
			className="rounded-xl border border-border bg-card p-6 shadow-sm"
		>
			<div>
				<SectionLabel>Recent Posts</SectionLabel>
			</div>

			{posts.length > 0 ? (
				<ul className="mt-5 divide-y divide-border">
					{posts.map((post) => (
						<li
							key={post.id}
							className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
						>
							<div className="min-w-0">
								<p className="truncate font-medium">{post.title}</p>

								<p className="mt-1 text-sm text-muted-foreground">
									{formatNumber(post.wordCount)} words
									{" · "}
									<time dateTime={post.updatedAt}>
										{formatDate(post.updatedAt)}
									</time>
								</p>
							</div>

							<StatusBadge status={post.status} />
						</li>
					))}
				</ul>
			) : (
				<div className="mt-5 rounded-lg border border-dashed border-border p-8 text-center">
					<IconFileText
						aria-hidden="true"
						className="mx-auto size-8 text-muted-foreground"
					/>
					<p className="mt-3 font-medium">No posts yet</p>
					<p className="mt-1 text-sm text-muted-foreground">
						Your recently updated posts will appear here.
					</p>
				</div>
			)}
			<Link
				to="/posts"
				className="mt-3.5 text-xs text-[#333] border-0 bg-transparent cursor-default flex items-center gap-1 hover:text-[#737373] transition-colors"
			>
				View all posts <IconChevronRight size={11} />
			</Link>
		</section>
	);
}
