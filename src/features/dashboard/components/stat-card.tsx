import { hexToRgba } from "#/lib/utils";

interface StatCardProps {
	accentColor: string;
	detail: string;
	label: string;
	value: string;
}

export function StatCard({ accentColor, detail, label, value }: StatCardProps) {
	return (
		<article className="rounded-lg border border-border bg-card px-4.5 py-4">
			<p className="font-semibold text-[22px] text-text-primary tabular-nums tracking-[-0.02em]">
				{value}
			</p>
			<p className="mt-1 text-[11px] text-text-soft">{label}</p>
			<p
				className="mt-2.5 truncate text-[11px]"
				style={{ color: hexToRgba(accentColor, 0.85) }}
				title={detail}
			>
				{detail}
			</p>
		</article>
	);
}
