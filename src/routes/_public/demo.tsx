import { createFileRoute } from "@tanstack/react-router";
import { DemoApp } from "#/features/demo/demo-app";

export const Route = createFileRoute("/_public/demo")({
	head: () => ({
		meta: [
			{
				title: "Live demo · PageOwl",
			},
			{
				name: "description",
				content:
					"Explore the PageOwl dashboard and editor with sample data — no signup required.",
			},
		],
	}),
	component: DemoRoute,
});

function DemoRoute() {
	return <DemoApp />;
}
