import { createFileRoute } from "@tanstack/react-router";
import { listMedia } from "#/features/media/functions/media-list.function";
import { MediaPage } from "#/features/media/pages/media-page";

export const Route = createFileRoute("/_protected/media")({
	loader: () => listMedia(),
	head: () => ({
		meta: [{ title: "Media · PageOwl" }],
	}),
	component: MediaRoute,
});

function MediaRoute() {
	const items = Route.useLoaderData();

	return <MediaPage initialItems={items} />;
}
