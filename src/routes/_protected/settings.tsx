import { createFileRoute } from "@tanstack/react-router";
import { SettingsPage } from "#/features/settings/pages/settings-page";

export const Route = createFileRoute("/_protected/settings")({
	head: () => ({
		meta: [{ title: "Settings · ContentOS" }],
	}),
	component: SettingsRoute,
});

function SettingsRoute() {
	const { user, appearance } = Route.useRouteContext();

	return <SettingsPage appearance={appearance} user={user} />;
}
