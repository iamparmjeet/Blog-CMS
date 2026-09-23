import {
	IconArrowRight,
	IconMenu,
	IconMoon,
	IconSun,
	IconX,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import {
	AnimatePresence,
	motion,
	useMotionValueEvent,
	useReducedMotion,
	useScroll,
} from "motion/react";
import { useEffect, useState } from "react";
import {
	readCachedAppearance,
	setAppearance,
} from "#/features/settings/appearance";
import { cn } from "#/lib/utils";
import { Button, buttonVariants } from "../ui/button";
import { Logo } from "./logo";
import { NavLinks } from "./nav-links";

export function Header() {
	const [scrolled, setScrolled] = useState(false);
	const [isDark, setIsDark] = useState(false);
	const [menuOpen, setMenuOpen] = useState(false);
	const shouldReduceMotion = useReducedMotion();
	const { scrollY } = useScroll();

	useEffect(() => {
		setIsDark(document.documentElement.classList.contains("dark"));
	}, []);

	useEffect(() => {
		if (!menuOpen) {
			return;
		}

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setMenuOpen(false);
			}
		};

		const desktop = window.matchMedia("(min-width: 768px)");
		const onDesktop = () => {
			if (desktop.matches) {
				setMenuOpen(false);
			}
		};

		window.addEventListener("keydown", onKeyDown);
		desktop.addEventListener("change", onDesktop);
		return () => {
			window.removeEventListener("keydown", onKeyDown);
			desktop.removeEventListener("change", onDesktop);
		};
	}, [menuOpen]);

	useMotionValueEvent(scrollY, "change", (latest) => {
		const next = latest > 20;
		setScrolled((prev) => (prev === next ? prev : next));
	});

	const closeMenu = () => setMenuOpen(false);

	return (
		<motion.header
			className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
				scrolled || menuOpen
					? "border-border border-b bg-background/90 shadow-sm backdrop-blur-xl"
					: "bg-transparent"
			}`}
		>
			<div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-3 sm:h-16 sm:px-6 lg:px-8">
				<Logo animated loop size="lg" />
				{/* Desktop nav*/}
				<NavLinks className="hidden md:flex" />

				{/* Right */}
				<div className="flex items-center gap-2">
					<Button
						aria-label={isDark ? "Switch to day mode" : "Switch to night mode"}
						className="size-10 rounded-full text-muted-foreground hover:text-foreground sm:size-9"
						title={isDark ? "Switch to day mode" : "Switch to night mode"}
						variant="ghost"
						onClick={() => {
							const nextMode = isDark ? "day" : "night";
							setAppearance({
								...readCachedAppearance(),
								themeMode: nextMode,
							});
							setIsDark(!isDark);
						}}
					>
						{isDark ? (
							<IconSun aria-hidden="true" className="size-4" />
						) : (
							<IconMoon aria-hidden="true" className="size-4" />
						)}
					</Button>
					<Link
						to="/login"
						className={cn(
							buttonVariants({ variant: "purple" }),
							"h-10 gap-1.5 px-3 sm:gap-2",
						)}
					>
						Sign In
						<IconArrowRight className="size-4" />
					</Link>
					<Button
						aria-controls="public-mobile-menu"
						aria-expanded={menuOpen}
						aria-label={menuOpen ? "Close menu" : "Open menu"}
						className="size-10 md:hidden"
						size="icon"
						type="button"
						variant="ghost"
						onClick={() => setMenuOpen((open) => !open)}
					>
						{menuOpen ? (
							<IconX aria-hidden="true" className="size-5" />
						) : (
							<IconMenu aria-hidden="true" className="size-5" />
						)}
					</Button>
				</div>
			</div>

			{/* Mobile nav */}
			<AnimatePresence initial={false}>
				{menuOpen ? (
					<motion.div
						id="public-mobile-menu"
						key="public-mobile-menu"
						className="overflow-hidden border-border border-t bg-background md:hidden"
						initial={
							shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }
						}
						animate={
							shouldReduceMotion
								? { opacity: 1 }
								: { height: "auto", opacity: 1 }
						}
						exit={
							shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }
						}
						transition={{
							duration: shouldReduceMotion ? 0 : 0.2,
							ease: "easeOut",
						}}
					>
						<nav className="mx-auto flex max-w-7xl flex-col gap-1 px-3 py-3">
							<NavLinks
								className="flex-col items-stretch gap-1"
								itemClassName="rounded-md px-3 py-3 hover:bg-muted"
								onNavigate={closeMenu}
							/>
						</nav>
					</motion.div>
				) : null}
			</AnimatePresence>
		</motion.header>
	);
}
