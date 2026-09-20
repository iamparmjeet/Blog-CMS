import type { AuthenticatedUser } from "#/lib/auth/auth.types";
import { formatNumber } from "#/lib/number";
import { ContinueCard } from "./components/continue-card";
import { DashboardHeader } from "./components/dashboard-header";
import { Heatmap } from "./components/heatmap";
import { RecentPosts } from "./components/recent-posts";
import { RhythmCard } from "./components/rhythm-card";
import { StatCard } from "./components/stat-card";
import type { DashboardData } from "./functions/dashboard.types";
import { summarizeActivity } from "./functions/dashboard.utils";

interface DashBoardPageProps {
	data: DashboardData;
	user: AuthenticatedUser;
}

export function DashBoardPage({ data, user }: DashBoardPageProps) {
	const firstName = user.name.trim().split(/\s+/)[0] || "there";
	const activity = summarizeActivity(data.activity);

	return (
		<main className="mx-auto flex w-full max-w-[840px] flex-col px-6 pt-9 pb-16 sm:px-10">
			<DashboardHeader firstName={firstName} />

			<section
				aria-label="Writing statistics"
				className="mt-7 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4"
			>
				<StatCard
					accentColor={data.accentColor}
					detail={`${formatNumber(data.activity.totalWordsAdded)} added in 12 weeks`}
					label="Total words"
					value={formatNumber(data.stats.totalWords)}
				/>
				<StatCard
					accentColor={data.accentColor}
					detail={`${data.stats.publishedPosts} published · ${data.stats.draftPosts} drafts`}
					label="Posts total"
					value={formatNumber(data.stats.totalPosts)}
				/>
				<StatCard
					accentColor={data.accentColor}
					detail="Live in the public feed"
					label="Published"
					value={formatNumber(data.stats.publishedPosts)}
				/>
				<StatCard
					accentColor={data.accentColor}
					detail="Ready to continue"
					label="Drafts"
					value={formatNumber(data.stats.draftPosts)}
				/>
			</section>

			<section
				aria-label="Continue writing and writing rhythm"
				className="mt-4 flex flex-col gap-2.5 lg:flex-row"
			>
				<ContinueCard
					accentColor={data.accentColor}
					className="lg:flex-[5]"
					post={data.continuePost}
				/>
				<RhythmCard
					accentColor={data.accentColor}
					className="lg:flex-[7]"
					summary={activity}
				/>
			</section>

			<div className="mt-8">
				<Heatmap accentColor={data.accentColor} data={data.activity} />
			</div>

			<div className="mt-8">
				<RecentPosts posts={data.recentPosts} />
			</div>
		</main>
	);
}
