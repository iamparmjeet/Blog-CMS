import { IconArrowRight, IconPencil } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { formatDate } from "#/lib/date";
import { formatNumber } from "#/lib/number";
import type { DashboardData } from "../functions/dashboard.types";

interface ContinueWritingCardProps {
	post: DashboardData["continuePost"];
	accentColor: string;
}

export function ContinueWritingCard({
	accentColor,
	post,
}: ContinueWritingCardProps) {
	return (
		<section
			aria-labelledby="continue-writing-heading"
			className="rounded-xl border border-border bg-card p-6 shadow-sm"
		>
			<div
				className="flex size-10 items-center justify-center rounded-lg"
				style={{
					color: accentColor,
					backgroundColor: `${accentColor}14`,
				}}
			>
				<IconPencil aria-hidden="true" className="size-5" />
			</div>
			<div>
				<h2 id="continue-writing-heading" className="font-semibold">
					Continue writing
				</h2>
				<p className="text-muted-foreground text-sm">
					Your most recently updated draft
				</p>
			</div>

			{post ? (
				<div className="mt-6">
					<h3 className="line-clamp-2 font-medium text-lg">{post.title}</h3>

					<div className="mt-3 flex flex-wrap items-center gap-3 text-muted-foreground text-sm">
						<span>{formatNumber(post.wordCount)} words</span>
						<span aria-hidden="true">·</span>
						<time dateTime={post.updatedAt}>
							Updated {formatDate(post.updatedAt)}
						</time>
					</div>

					<Link
						to="/posts"
						className="mt-6 inline-flex items-center gap-2 font-medium text-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						style={{ color: accentColor }}
					>
						Open posts
						<IconArrowRight aria-hidden="true" className="size-4" />
					</Link>
				</div>
			) : (
				<div className="mt-6 rounded-lg border border-border border-dashed p-5">
					<p className="font-medium">No draft to continue</p>
					<p className="mt-1 text-muted-foreground text-sm">
						Your next draft will appear here.
					</p>

					<Link
						to="/posts"
						className="mt-4 inline-flex items-center gap-2 font-medium text-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						style={{ color: accentColor }}
					>
						View posts
						<IconArrowRight aria-hidden="true" className="size-4" />
					</Link>
				</div>
			)}
		</section>
	);
}
