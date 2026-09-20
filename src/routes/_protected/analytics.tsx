import { createFileRoute } from "@tanstack/react-router";
import { AnalyticsPage } from "#/features/analytics/pages/analytics-page";

export const Route = createFileRoute("/_protected/analytics")({
	head: () => ({
		meta: [{ title: "Analytics · ContentOS" }],
	}),
	component: AnalyticsRoute,
});

function AnalyticsRoute() {
	return <AnalyticsPage />;
}
