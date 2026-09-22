import { IconMenu2 } from "@tabler/icons-react";
import {
	createFileRoute,
	Outlet,
	redirect,
	useRouter,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
	CommandPalette,
	ShortcutsModal,
} from "#/components/content-os/command-palette";
import { AppBrand, Sidebar } from "#/components/content-os/sidebar";
import { SidebarPostProvider } from "#/components/content-os/sidebar-context";
import { Button } from "#/components/ui/button";
import { setAppearance } from "#/features/settings/appearance";
import { getAppearanceSettings } from "#/features/settings/functions/settings.function";
import { getSession } from "#/lib/auth/auth.functions";

export const Route = createFileRoute("/_protected")({
	beforeLoad: async ({ location }) => {
		const session = await getSession();

		if (!session) {
			throw redirect({
				to: "/login",
				search: {
					redirect: location.href,
				},
				replace: true,
			});
		}

		const appearance = await getAppearanceSettings();

		return { user: session.user, appearance };
	},
	component: ProtectedLayout,
});

const GO_DESTINATIONS: Record<
	string,
	"/dashboard" | "/posts" | "/media" | "/analytics" | "/settings"
> = {
	a: "/analytics",
	h: "/dashboard",
	p: "/posts",
	s: "/settings",
};

function ProtectedLayout() {
	const { user, appearance } = Route.useRouteContext();
	const router = useRouter();
	const [paletteOpen, setPaletteOpen] = useState(false);
	const [shortcutsOpen, setShortcutsOpen] = useState(false);
	const [mobileNavOpen, setMobileNavOpen] = useState(false);

	useEffect(() => {
		setAppearance(appearance);
	}, [appearance]);

	useEffect(() => {
		let chordActive = false;
		let chordTimer: number | undefined;

		function handleKeyDown(event: KeyboardEvent) {
			const modifier = event.metaKey || event.ctrlKey;
			const key = event.key.toLowerCase();

			if (modifier && key === "k") {
				event.preventDefault();
				setPaletteOpen((open) => !open);
				return;
			}

			if (modifier && event.key === "?") {
				event.preventDefault();
				setShortcutsOpen((open) => !open);
				return;
			}

			if (modifier && key === "n") {
				event.preventDefault();
				void router.navigate({ to: "/posts" });
				return;
			}

			if (event.key === "Escape") {
				setPaletteOpen(false);
				setShortcutsOpen(false);
				setMobileNavOpen(false);
				return;
			}

			const target = event.target as HTMLElement | null;

			if (
				event.altKey ||
				modifier ||
				(target &&
					(target.isContentEditable ||
						["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName)))
			) {
				return;
			}

			if (key === "g") {
				chordActive = true;
				window.clearTimeout(chordTimer);
				chordTimer = window.setTimeout(() => {
					chordActive = false;
				}, 800);
				return;
			}

			if (!chordActive) {
				return;
			}

			chordActive = false;
			window.clearTimeout(chordTimer);

			const destination = GO_DESTINATIONS[key];

			if (destination) {
				event.preventDefault();
				void router.navigate({ to: destination });
			}
		}

		window.addEventListener("keydown", handleKeyDown);

		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			window.clearTimeout(chordTimer);
		};
	}, [router]);

	return (
		<SidebarPostProvider>
			<div className="flex h-dvh overflow-hidden bg-app-bg text-text-primary">
				<Sidebar className="hidden lg:flex" user={user} />

				{mobileNavOpen ? (
					<div className="fixed inset-0 z-50 lg:hidden">
						<button
							aria-label="Close navigation"
							className="absolute inset-0 bg-black/60"
							onClick={() => setMobileNavOpen(false)}
							type="button"
						/>
						<Sidebar
							className="relative"
							onClose={() => setMobileNavOpen(false)}
							user={user}
						/>
					</div>
				) : null}

				<div className="flex min-w-0 flex-1 flex-col">
					<header className="flex h-14 shrink-0 items-center gap-3 border-border border-b bg-sidebar-bg px-4 lg:hidden">
						<Button
							aria-label="Open navigation"
							onClick={() => setMobileNavOpen(true)}
							size="icon-sm"
							type="button"
							variant="ghost"
						>
							<IconMenu2 aria-hidden="true" className="size-4" />
						</Button>
						<AppBrand />
					</header>

					<div className="min-w-0 flex-1 overflow-y-auto bg-app-bg">
						<Outlet />
					</div>
				</div>

				<CommandPalette
					onClose={() => setPaletteOpen(false)}
					onShowShortcuts={() => {
						setPaletteOpen(false);
						setShortcutsOpen(true);
					}}
					open={paletteOpen}
				/>
				<ShortcutsModal
					onClose={() => setShortcutsOpen(false)}
					open={shortcutsOpen}
				/>
			</div>
		</SidebarPostProvider>
	);
}
