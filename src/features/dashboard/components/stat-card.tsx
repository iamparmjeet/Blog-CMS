import { Link } from "@tanstack/react-router";
import { hexToRgba } from "#/lib/utils";

interface StatCardProps {
	accentColor: string;
	detail: string;
	label: string;
	search?: { tab: string };
	value: string;
}

export function StatCard({
	accentColor,
	detail,
	label,
	search,
	value,
}: StatCardProps) {
	const body = (
		<>
			<p className="text-[11px] text-text-soft">{label}</p>
			<p className="mt-2 font-semibold text-[28px] text-text-primary tabular-nums leading-none tracking-[-0.035em]">
				{value}
			</p>
			<p
				className="mt-4 truncate text-[11px]"
				style={{ color: hexToRgba(accentColor, 0.85) }}
				title={detail}
			>
				{detail}
			</p>
		</>
	);

	return (
		<article className="group relative overflow-hidden rounded-xl border border-border bg-flat-surface p-4.5 transition-colors hover:border-input">
			<span
				aria-hidden="true"
				className="absolute inset-x-0 top-0 h-px opacity-70"
				style={{ background: accentColor }}
			/>
			{search ? (
				<Link
					className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					search={search}
					to="/posts"
				>
					{body}
				</Link>
			) : (
				body
			)}
		</article>
	);
}
