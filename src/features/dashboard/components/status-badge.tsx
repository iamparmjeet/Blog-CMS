import type { PostStatus } from "#/features/posts/functions/posts.types";

export function StatusBadge({ status }: { status: PostStatus }) {
	const labels: Record<PostStatus, string> = {
		draft: "Draft",
		published: "Published",
		scheduled: "Scheduled",
		archived: "Archived",
	};

	const classes: Record<PostStatus, string> = {
		draft: "border-amber-500/20 bg-amber-500/10 text-amber-400",
		published: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
		scheduled: "border-blue-500/20 bg-blue-500/10 text-blue-400",
		archived: "border-slate-500/20 bg-slate-500/10 text-slate-400",
	};

	return (
		<span
			className={`shrink-0 rounded-full border px-2.5 py-1 font-medium text-xs ${classes[status]}`}
		>
			{labels[status]}
		</span>
	);
}
