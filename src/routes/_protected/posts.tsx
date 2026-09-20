import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_protected/posts")({
	component: PostsLayout,
});

function PostsLayout() {
	return <Outlet />;
}
