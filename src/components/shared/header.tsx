import {
	IconArrowRight,
	IconMenu,
	IconMoon,
	IconSun,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
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
	const { scrollY } = useScroll();

	useEffect(() => {
		setIsDark(document.documentElement.classList.contains("dark"));
	}, []);

	useMotionValueEvent(scrollY, "change", (latest) => {
		const next = latest > 20;
		setScrolled((prev) => (prev === next ? prev : next));
	});

	return (
		<motion.header
			className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
				scrolled
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
						className="size-8 rounded-full text-muted-foreground hover:text-foreground sm:size-9"
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
							"h-8 gap-1.5 px-2.5 sm:h-10 sm:gap-2 sm:px-3",
						)}
					>
						Sign In
						<IconArrowRight className="size-4" />
					</Link>
					<Button
						variant="ghost"
						size="icon"
						className="md:hidden"
						aria-label="Open menu"
					>
						<IconMenu className="h-5 w-5" />
					</Button>
				</div>
			</div>
		</motion.header>
	);
}
