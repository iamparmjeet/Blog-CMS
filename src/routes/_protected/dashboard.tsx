import { createFileRoute } from "@tanstack/react-router";
import { getDashboardData } from "#/features/dashboard/dashboard.function";
import { DashBoardPage } from "#/features/dashboard/dashboard-page";

export const Route = createFileRoute("/_protected/dashboard")({
	loader: () => getDashboardData(),
	component: DashBoardRoute,
});

function DashBoardRoute() {
	const { user } = Route.useRouteContext();
	const dashbaordData = Route.useLoaderData();

	return (
		<DashBoardPage user={user} welcomeMessage={dashbaordData.welcomeMessage} />
	);
}
