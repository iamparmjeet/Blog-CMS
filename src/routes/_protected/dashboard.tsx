import { createFileRoute } from "@tanstack/react-router";
import { DashBoardPage } from "#/features/dashboard/dashboard-page";
import { getDashboardData } from "#/features/dashboard/functions/dashboard.function";

export const Route = createFileRoute("/_protected/dashboard")({
	loader: () => getDashboardData(),
	head: () => ({
		meta: [
			{
				title: "Dashboard · ContentOS",
			},
		],
	}),
	pendingComponent: DashboardPending,
	component: DashBoardRoute,
});

function DashboardPending() {
	return (
		<main className="mx-auto flex w-full max-w-[1080px] flex-col px-4 pt-7 pb-16 sm:px-8 sm:pt-10 lg:px-12">
			<p
				aria-busy="true"
				aria-live="polite"
				className="text-sm text-text-muted"
			>
				Loading dashboard…
			</p>
		</main>
	);
}

function DashBoardRoute() {
	const { user } = Route.useRouteContext();
	const dashbaordData = Route.useLoaderData();

	return <DashBoardPage user={user} data={dashbaordData} />;
}
