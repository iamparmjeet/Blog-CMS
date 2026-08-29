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
	component: DashBoardRoute,
});

function DashBoardRoute() {
	const { user } = Route.useRouteContext();
	const dashbaordData = Route.useLoaderData();

	return <DashBoardPage user={user} data={dashbaordData} />;
}
