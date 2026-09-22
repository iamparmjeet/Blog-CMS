import { useState } from "react";
import { SegmentedControl } from "#/components/content-os/ui";
import { formatNumber } from "#/lib/number";
import { DEMO_ANALYTICS } from "../analytics.data";
import type { AnalyticsRange } from "../analytics.types";
import {
	AnalyticsCard,
	BarList,
	StatTile,
	TopPagesTable,
	ViewsChart,
} from "../components/analytics-widgets";

const RANGES: { label: string; value: AnalyticsRange }[] = [
	{ label: "7d", value: "7d" },
	{ label: "30d", value: "30d" },
	{ label: "90d", value: "90d" },
];

const RANGE_DAYS: Record<AnalyticsRange, number> = {
	"7d": 7,
	"30d": 30,
	"90d": 90,
};

export function AnalyticsPage() {
	const [range, setRange] = useState<AnalyticsRange>("30d");

	const dayCount = RANGE_DAYS[range];
	const daily = DEMO_ANALYTICS.daily.slice(-dayCount);
	const totalViews = daily.reduce((sum, day) => sum + day.views, 0);

	return (
		<main className="mx-auto flex w-full max-w-[1120px] flex-col px-4 pt-7 pb-16 sm:px-8 sm:pt-10 lg:px-12">
			<header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h1 className="font-semibold text-[28px] text-text-primary tracking-[-0.035em] sm:text-[32px]">
						Analytics
					</h1>
					<p className="mt-1.5 text-[13px] text-text-muted">
						Traffic and reading behavior for published posts.
					</p>
				</div>

				<div className="flex flex-wrap items-center gap-2">
					<SegmentedControl
						onChange={setRange}
						options={RANGES}
						value={range}
					/>
					<span className="flex items-center gap-1.5 rounded border border-warning/20 bg-warning/10 px-2 py-1 text-[11px] text-warning">
						<span className="size-1.5 rounded-full bg-warning" />
						Umami not connected
					</span>
				</div>
			</header>

			<section
				aria-label="Traffic statistics"
				className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
			>
				<StatTile
					detail={`Last ${dayCount} days`}
					label="Blog views"
					value={formatNumber(totalViews)}
				/>
				<StatTile
					detail="Unique readers"
					label="Visitors"
					value={formatNumber(Math.round(totalViews * 0.6))}
				/>
				<StatTile
					detail="Single-page sessions"
					label="Bounce rate"
					value="74%"
				/>
				<StatTile detail="Per session" label="Avg visit time" value="4m 22s" />
			</section>

			<div className="mt-4 flex flex-col gap-2.5">
				<AnalyticsCard title="Blog views over time">
					<ViewsChart daily={daily} />
				</AnalyticsCard>

				<AnalyticsCard title="Top blog pages">
					<TopPagesTable pages={DEMO_ANALYTICS.topPages} />
				</AnalyticsCard>

				<div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
					<AnalyticsCard title="Countries">
						<BarList items={DEMO_ANALYTICS.countries} />
					</AnalyticsCard>
					<AnalyticsCard title="Traffic sources">
						<BarList items={DEMO_ANALYTICS.referrers} />
					</AnalyticsCard>
					<AnalyticsCard title="Browsers">
						<BarList items={DEMO_ANALYTICS.browsers} />
					</AnalyticsCard>
					<AnalyticsCard title="Operating systems">
						<BarList items={DEMO_ANALYTICS.operatingSystems} />
					</AnalyticsCard>
					<AnalyticsCard title="Devices">
						<BarList items={DEMO_ANALYTICS.devices} />
					</AnalyticsCard>

					<AnalyticsCard>
						<p className="font-medium text-[13px] text-text-body">
							Umami analytics is not connected
						</p>
						<p className="mt-1 text-text-muted text-xs leading-relaxed">
							Add your Umami share URL in Settings to replace these sample
							numbers with live traffic.
						</p>
					</AnalyticsCard>
				</div>
			</div>
		</main>
	);
}
