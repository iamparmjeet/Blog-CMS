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
	onCreateDraft?: () => void;
	onOpenPost?: (postId: number) => void;
	onSelectTab?: (tab: "all" | "published" | "drafts") => void;
	onViewAllPosts?: () => void;
	user: AuthenticatedUser;
}

export function DashBoardPage({
	data,
	onCreateDraft,
	onOpenPost,
	onSelectTab,
	onViewAllPosts,
	user,
}: DashBoardPageProps) {
	const firstName = user.name.trim().split(/\s+/)[0] || "there";
	const activity = summarizeActivity(data.activity);

	return (
		<main className="mx-auto flex w-full max-w-[1080px] flex-col px-4 pt-7 pb-16 sm:px-8 sm:pt-10 lg:px-12">
			<DashboardHeader
				firstName={firstName}
				onCreateDraft={onCreateDraft}
				timeZone={data.activity.timeZone}
			/>

			<section
				aria-label="Writing statistics"
				className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
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
					onSelect={onSelectTab ? () => onSelectTab("all") : undefined}
					search={{ tab: "all" }}
					value={formatNumber(data.stats.totalPosts)}
				/>
				<StatCard
					accentColor={data.accentColor}
					detail="Live in the public feed"
					label="Published"
					onSelect={onSelectTab ? () => onSelectTab("published") : undefined}
					search={{ tab: "published" }}
					value={formatNumber(data.stats.publishedPosts)}
				/>
				<StatCard
					accentColor={data.accentColor}
					detail="Ready to continue"
					label="Drafts"
					onSelect={onSelectTab ? () => onSelectTab("drafts") : undefined}
					search={{ tab: "drafts" }}
					value={formatNumber(data.stats.draftPosts)}
				/>
			</section>

			<section
				aria-label="Continue writing and writing rhythm"
				className="mt-3 grid gap-3 lg:grid-cols-12"
			>
				<ContinueCard
					accentColor={data.accentColor}
					className="lg:col-span-5"
					onOpenPost={onOpenPost}
					post={data.continuePost}
				/>
				<RhythmCard
					accentColor={data.accentColor}
					className="lg:col-span-7"
					summary={activity}
				/>
			</section>

			<div className="mt-3 rounded-xl border border-border bg-flat-surface p-4 sm:p-5">
				<Heatmap accentColor={data.accentColor} data={data.activity} />
			</div>

			<div className="mt-3 rounded-xl border border-border bg-flat-surface p-4 sm:p-5">
				<RecentPosts
					onOpenPost={onOpenPost}
					onViewAll={onViewAllPosts}
					posts={data.recentPosts}
				/>
			</div>
		</main>
	);
}
