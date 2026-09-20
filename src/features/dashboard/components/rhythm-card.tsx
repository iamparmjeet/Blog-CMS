import { formatNumber } from "#/lib/number";
import { cn } from "#/lib/utils";
import type { ActivitySummary } from "../functions/dashboard.utils";

interface RhythmCardProps {
	accentColor: string;
	className?: string;
	summary: ActivitySummary;
}

export function RhythmCard({
	accentColor,
	className,
	summary,
}: RhythmCardProps) {
	const progress = Math.min(
		100,
		Math.round((summary.thisWeek / Math.max(summary.bestWeek, 1)) * 100),
	);

	const rows = [
		{ label: "This week", value: `${formatNumber(summary.thisWeek)} words` },
		{
			label: "Daily average",
			value: `${formatNumber(summary.dailyAverage)} words`,
		},
		{ label: "Best day", value: `${formatNumber(summary.bestDay)} words` },
		{
			label: "Current streak",
			value: `${summary.currentStreak} ${summary.currentStreak === 1 ? "day" : "days"}`,
		},
	];

	return (
		<section
			className={cn("rounded-lg border border-border bg-card p-4", className)}
		>
			<p className="font-semibold text-[10px] text-text-ghost uppercase tracking-[0.07em]">
				Writing rhythm
			</p>

			<div className="mt-2.5 flex items-baseline gap-2">
				<p className="font-semibold text-[22px] text-text-primary tabular-nums tracking-[-0.02em]">
					{formatNumber(summary.thisWeek)}
				</p>
				<p className="text-text-muted text-xs">words this week</p>
			</div>

			<div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border-dim">
				<div
					className="h-full rounded-full transition-[width] duration-500"
					style={{ background: accentColor, width: `${progress}%` }}
				/>
			</div>
			<p className="mt-1.5 text-[11px] text-text-muted">
				{progress}% of your best week
			</p>

			<dl className="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-2">
				{rows.map((row) => (
					<div
						className="flex items-center justify-between py-0.5"
						key={row.label}
					>
						<dt className="text-text-muted text-xs">{row.label}</dt>
						<dd className="font-mono text-text-soft text-xs tabular-nums">
							{row.value}
						</dd>
					</div>
				))}
			</dl>
		</section>
	);
}
