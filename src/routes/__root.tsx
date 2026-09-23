import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { ErrorPage, NotFoundPage } from "#/components/feedback";
import { APPEARANCE_BOOTSTRAP_SCRIPT } from "#/features/settings/appearance";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import appCss from "../styles.css?url";

interface MyRouterContext {
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "PageOwl",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
			{
				rel: "icon",
				type: "image/x-icon",
				href: "/favicon.ico?v=pageowl-2",
			},
			{
				rel: "icon",
				type: "image/png",
				sizes: "32x32",
				href: "/favicon-32.png?v=pageowl-2",
			},
			{
				rel: "icon",
				type: "image/svg+xml",
				href: "/favicon.svg?v=pageowl-2",
			},
			{
				rel: "apple-touch-icon",
				sizes: "192x192",
				href: "/logo192.png?v=pageowl-2",
			},
			{
				rel: "manifest",
				href: "/manifest.json",
			},
		],
	}),
	shellComponent: RootDocument,
	notFoundComponent: NotFoundPage,
	errorComponent: ErrorPage,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html suppressHydrationWarning lang="en">
			<head>
				<script
					// biome-ignore lint/security/noDangerouslySetInnerHtml: static bootstrap script, no user input
					dangerouslySetInnerHTML={{ __html: APPEARANCE_BOOTSTRAP_SCRIPT }}
				/>
				<HeadContent />
			</head>
			<body className="wrap-anywhere font-sans antialiased">
				<main className="min-h-screen bg-background">{children}</main>
				<TanStackDevtools
					config={{
						position: "bottom-right",
					}}
					plugins={[
						{
							name: "Tanstack Router",
							render: <TanStackRouterDevtoolsPanel />,
						},
						TanStackQueryDevtools,
					]}
				/>
				<Scripts />
			</body>
		</html>
	);
}
