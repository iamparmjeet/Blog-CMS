import { formatNumber } from "#/lib/number";
import { hexToRgba } from "#/lib/utils";
import type { BarItem, DailyView, TopPage } from "../analytics.types";

export function AnalyticsCard({
	action,
	children,
	title,
}: {
	action?: React.ReactNode;
	children: React.ReactNode;
	title?: string;
}) {
	return (
		<section className="rounded-lg border border-border bg-flat-surface p-4">
			{title || action ? (
				<div className="mb-3 flex items-center justify-between gap-3">
					{title ? (
						<h2 className="font-medium text-[13px] text-text-body">{title}</h2>
					) : (
						<span />
					)}
					{action}
				</div>
			) : null}
			{children}
		</section>
	);
}

export function StatTile({
	accentColor,
	detail,
	label,
	value,
}: {
	accentColor: string;
	detail: string;
	label: string;
	value: string;
}) {
	return (
		<article className="rounded-lg border border-border bg-flat-surface px-4.5 py-4">
			<p className="text-[11px] text-text-soft">{label}</p>
			<p className="mt-1.5 font-semibold text-[22px] text-text-primary tabular-nums tracking-[-0.02em]">
				{value}
			</p>
			<p
				className="mt-1.5 truncate text-[11px]"
				style={{ color: hexToRgba(accentColor, 0.85) }}
				title={detail}
			>
				{detail}
			</p>
		</article>
	);
}

export function BarList({
	accentColor,
	items,
}: {
	accentColor: string;
	items: BarItem[];
}) {
	const max = Math.max(...items.map((item) => item.value), 1);

	return (
		<ul className="flex flex-col gap-2.5">
			{items.map((item) => (
				<li key={item.label}>
					<div className="flex items-center justify-between gap-3 text-xs">
						<span className="truncate text-text-secondary">{item.label}</span>
						<span className="font-mono text-text-muted tabular-nums">
							{formatNumber(item.value)}
						</span>
					</div>
					<div className="mt-1 h-1 overflow-hidden rounded-full bg-border-dim">
						<div
							className="h-full rounded-full"
							style={{
								background: accentColor,
								width: `${(item.value / max) * 100}%`,
							}}
						/>
					</div>
				</li>
			))}
		</ul>
	);
}

export function ViewsChart({
	accentColor,
	daily,
}: {
	accentColor: string;
	daily: DailyView[];
}) {
	const max = Math.max(...daily.map((day) => day.views), 1);
	const lastSevenStart = daily.length - 7;
	const first = daily[0]?.date;
	const middle = daily[Math.floor(daily.length / 2)]?.date;
	const last = daily.at(-1)?.date;

	return (
		<div>
			<div className="flex h-[180px] items-end gap-[3px]">
				{daily.map((day, index) => (
					<div
						className="flex-1 rounded-t-[2px]"
						key={day.date}
						style={{
							background:
								index >= lastSevenStart
									? accentColor
									: hexToRgba(accentColor, 0.4),
							height: `${Math.max(2, (day.views / max) * 100)}%`,
						}}
						title={`${day.date}: ${formatNumber(day.views)} views`}
					/>
				))}
			</div>

			<div className="mt-2 flex justify-between text-[10px] text-text-faint">
				<span>{formatAxisDate(first)}</span>
				<span>{formatAxisDate(middle)}</span>
				<span>{formatAxisDate(last)}</span>
			</div>

			<div className="mt-2 flex items-center gap-4 text-[11px] text-text-muted">
				<span className="flex items-center gap-1.5">
					<span
						className="size-2 rounded-sm"
						style={{ background: hexToRgba(accentColor, 0.4) }}
					/>
					Prior weeks
				</span>
				<span className="flex items-center gap-1.5">
					<span
						className="size-2 rounded-sm"
						style={{ background: accentColor }}
					/>
					Last 7 days
				</span>
			</div>
		</div>
	);
}

export function TopPagesTable({
	accentColor,
	pages,
}: {
	accentColor: string;
	pages: TopPage[];
}) {
	const max = Math.max(...pages.map((page) => page.views), 1);

	return (
		<div className="overflow-x-auto">
			<table className="w-full min-w-[520px] border-collapse text-left">
				<thead>
					<tr className="border-border-subtle border-b font-medium text-[10px] text-text-dim uppercase tracking-[0.04em]">
						<th className="py-2 font-medium">Page</th>
						<th className="py-2 text-right font-medium">Views</th>
						<th className="w-[160px] py-2 pl-6 font-medium">Share</th>
					</tr>
				</thead>
				<tbody>
					{pages.map((page) => (
						<tr
							className="border-border-dim border-b last:border-b-0"
							key={page.path}
						>
							<td className="py-2.5">
								<span className="block truncate font-medium text-text-body text-xs">
									{page.title}
								</span>
								<span className="mt-0.5 block truncate font-mono text-[10px] text-text-muted">
									{page.path}
								</span>
							</td>
							<td className="py-2.5 text-right font-mono text-text-secondary text-xs tabular-nums">
								{formatNumber(page.views)}
							</td>
							<td className="py-2.5 pl-6">
								<div className="flex items-center gap-2">
									<div className="h-1 flex-1 overflow-hidden rounded-full bg-border-dim">
										<div
											className="h-full rounded-full"
											style={{
												background: accentColor,
												width: `${(page.views / max) * 100}%`,
											}}
										/>
									</div>
									<span className="w-9 text-right font-mono text-[11px] text-text-muted tabular-nums">
										{Math.round((page.views / max) * 100)}%
									</span>
								</div>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function formatAxisDate(date: string | undefined): string {
	if (!date) {
		return "";
	}

	return new Intl.DateTimeFormat("en-US", {
		day: "numeric",
		month: "short",
		timeZone: "UTC",
	}).format(new Date(`${date}T00:00:00.000Z`));
}
