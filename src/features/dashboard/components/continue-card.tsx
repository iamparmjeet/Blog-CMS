import { IconChevronRight } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { StatusBadge } from "#/components/content-os/ui";
import { formatDate } from "#/lib/date";
import { formatNumber } from "#/lib/number";
import { cn } from "#/lib/utils";
import type { DashboardPostSummary } from "../functions/dashboard.types";

interface ContinueCardProps {
	accentColor: string;
	className?: string;
	post: DashboardPostSummary | null;
}

export function ContinueCard({
	accentColor,
	className,
	post,
}: ContinueCardProps) {
	return (
		<section
			className={cn(
				"flex flex-col rounded-lg border border-border bg-card p-4",
				className,
			)}
		>
			<p className="font-semibold text-[10px] text-text-ghost uppercase tracking-[0.07em]">
				Continue writing
			</p>

			{post ? (
				<>
					<div className="mt-2.5 flex items-center gap-2">
						<StatusBadge status={post.status} />
						<span className="text-[11px] text-text-muted">
							Updated {formatDate(post.updatedAt)}
						</span>
					</div>

					<Link
						className="mt-2.5 line-clamp-2 font-medium text-[15px] text-text-primary leading-snug transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						params={{ postId: String(post.id) }}
						to="/posts/$postId"
					>
						{post.title}
					</Link>

					<div className="mt-auto flex items-center justify-between pt-4">
						<span className="text-[11px] text-text-muted tabular-nums">
							{formatNumber(post.wordCount)} words
						</span>

						<Link
							className="inline-flex items-center gap-0.5 font-medium text-xs transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							params={{ postId: String(post.id) }}
							style={{ color: accentColor }}
							to="/posts/$postId"
						>
							Open
							<IconChevronRight aria-hidden="true" className="size-3" />
						</Link>
					</div>
				</>
			) : (
				<>
					<p className="mt-2.5 text-[13px] text-text-body">
						No draft to continue.
					</p>
					<p className="mt-1 text-[11px] text-text-muted">
						Your next draft will appear here.
					</p>
				</>
			)}
		</section>
	);
}
