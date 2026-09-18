import {
	IconAlignLeft,
	IconFileText,
	IconPencil,
	IconWorld,
} from "@tabler/icons-react";

import type { CSSProperties } from "react";
import type { AuthenticatedUser } from "#/lib/auth/auth.types";
import { formatNumber } from "#/lib/number";
import { ContinueWritingCard } from "./components/continue-writing-card";
import { DashboardHeader } from "./components/dashboard-header";
import { Heatmap } from "./components/heatmap";
import { RecentPosts } from "./components/recent-posts";
import { StatCard } from "./components/stat-card";
import type { DashboardData } from "./functions/dashboard.types";

interface DashBoardPageProps {
	user: AuthenticatedUser;
	data: DashboardData;
}

interface DashboardStyle extends CSSProperties {
	"--dashboard-accent": string;
}

export function DashBoardPage({ user, data }: DashBoardPageProps) {
	const firstName = user.name.trim().split(/\s+/)[0] || "there";

	const dashboardStyle: DashboardStyle = {
		"--dashboard-accent": data.accentColor,
	};

	return (
		<main
			className="min-h-screen bg-background text-foreground"
			style={dashboardStyle}
		>
			<div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:px-6 lg:px-8">
				{/*  Header */}
				<DashboardHeader firstName={firstName} data={data} />

				{/* Stat Card */}
				<section
					aria-label="Writing statistics"
					className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
				>
					<StatCard
						label="Total words"
						value={formatNumber(data.stats.totalWords)}
						icon={<IconAlignLeft aria-hidden="true" className="size-5" />}
						accentColor={data.accentColor}
					/>
					<StatCard
						label="Total posts"
						value={formatNumber(data.stats.totalPosts)}
						icon={<IconFileText aria-hidden="true" className="size-5" />}
						accentColor={data.accentColor}
					/>

					<StatCard
						label="Published"
						value={formatNumber(data.stats.publishedPosts)}
						icon={<IconWorld aria-hidden="true" className="size-5" />}
						accentColor={data.accentColor}
					/>

					<StatCard
						label="Drafts"
						value={formatNumber(data.stats.draftPosts)}
						icon={<IconPencil aria-hidden="true" className="size-5" />}
						accentColor={data.accentColor}
					/>
				</section>

				<ContinueWritingCard
					post={data.continuePost}
					accentColor={data.accentColor}
				/>
				{/* HeatMap */}
				<Heatmap data={data.activity} />

				{/* Recent Posts*/}
				<div>
					<RecentPosts posts={data.recentPosts} />
				</div>
			</div>
		</main>
	);
}
