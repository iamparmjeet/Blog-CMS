import { Button } from "#/components/ui/button";
import { StatCard } from "#/features/dashboard/components/stat-card";
import { formatNumber } from "#/lib/number";
import { buildDemoAnalytics, DEMO_ACCENT_COLOR } from "./demo-data";

export function DemoAnalytics({
	onOpenSettings,
}: {
	onOpenSettings: () => void;
}) {
	const data = buildDemoAnalytics();
	const maxViews = Math.max(...data.last14Days.map((entry) => entry.views), 1);
	const totalViews = data.last14Days.reduce(
		(total, entry) => total + entry.views,
		0,
	);
	const minutes = Math.floor(data.avgVisitSeconds / 60);
	const seconds = data.avgVisitSeconds % 60;

	return (
		<main className="mx-auto flex w-full max-w-[1080px] flex-col px-4 pt-7 pb-16 sm:px-8 sm:pt-10 lg:px-12">
			<header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h1 className="font-semibold text-[28px] text-text-primary tracking-[-0.035em] sm:text-[32px]">
						Analytics
					</h1>
					<p className="mt-1.5 text-[13px] text-text-muted">
						Sample traffic. Connect Umami in Settings to see live numbers.
					</p>
				</div>
				<Button
					onClick={onOpenSettings}
					size="sm"
					type="button"
					variant="outline"
				>
					Open Settings
				</Button>
			</header>

			<section
				aria-label="Traffic statistics"
				className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
			>
				<StatCard
					accentColor={DEMO_ACCENT_COLOR}
					detail="Last 14 days"
					label="Visitors"
					value={formatNumber(data.visitors)}
				/>
				<StatCard
					accentColor={DEMO_ACCENT_COLOR}
					detail="Across all published posts"
					label="Pageviews"
					value={formatNumber(data.pageviews)}
				/>
				<StatCard
					accentColor={DEMO_ACCENT_COLOR}
					detail="Per visit"
					label="Avg. visit"
					value={`${minutes}m ${seconds}s`}
				/>
				<StatCard
					accentColor={DEMO_ACCENT_COLOR}
					detail="Single-page visits"
					label="Bounce rate"
					value={`${Math.round(data.bounceRate * 100)}%`}
				/>
			</section>

			<section
				aria-label="Pageviews per day"
				className="mt-3 rounded-xl border border-border bg-flat-surface p-4 sm:p-5"
			>
				<div className="flex items-center justify-between gap-4">
					<p className="font-medium text-[11px] text-text-muted uppercase tracking-[0.04em]">
						Pageviews · last 14 days
					</p>
					<p className="text-[11px] text-text-muted tabular-nums">
						{formatNumber(totalViews)} total
					</p>
				</div>

				<div className="mt-5 flex h-40 items-end gap-1.5">
					{data.last14Days.map((entry) => (
						<div
							className="flex-1 rounded-t bg-brand/80"
							key={entry.day}
							style={{
								height: `${Math.round((entry.views / maxViews) * 100)}%`,
							}}
							title={`${entry.views} pageviews`}
						/>
					))}
				</div>
			</section>

			<section
				aria-label="Top pages"
				className="mt-3 rounded-xl border border-border bg-flat-surface p-4 sm:p-5"
			>
				<p className="font-medium text-[11px] text-text-muted uppercase tracking-[0.04em]">
					Top pages
				</p>
				<ul className="mt-3">
					{data.topPages.map((page) => (
						<li
							className="flex items-center justify-between gap-4 border-border-subtle border-b py-2.5 last:border-b-0"
							key={page.path}
						>
							<span className="truncate font-mono text-[12px] text-text-body">
								{page.path}
							</span>
							<span className="shrink-0 text-[11px] text-text-muted tabular-nums">
								{formatNumber(page.views)} views
							</span>
						</li>
					))}
				</ul>
			</section>
		</main>
	);
}
