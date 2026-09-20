import { createFileRoute } from "@tanstack/react-router";
import { MediaPage } from "#/features/media/pages/media-page";

export const Route = createFileRoute("/_protected/media")({
	head: () => ({
		meta: [{ title: "Media · ContentOS" }],
	}),
	component: MediaRoute,
});

function MediaRoute() {
	return <MediaPage />;
}
