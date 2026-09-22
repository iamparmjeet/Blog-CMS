import { createFileRoute } from "@tanstack/react-router";
import { getAnalyticsDisplay } from "#/features/analytics/functions/analytics.function";
import { AnalyticsPage } from "#/features/analytics/pages/analytics-page";

export const Route = createFileRoute("/_protected/analytics")({
	loader: () => getAnalyticsDisplay(),
	head: () => ({
		meta: [{ title: "Analytics · ContentOS" }],
	}),
	component: AnalyticsRoute,
});

function AnalyticsRoute() {
	const config = Route.useLoaderData();

	return <AnalyticsPage config={config} />;
}
