import { IconArrowRight, IconMenu } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { useState } from "react";
import { cn } from "#/lib/utils";
import { Button, buttonVariants } from "../ui/button";
import { Logo } from "./logo";
import { NavLinks } from "./nav-links";

export function Header() {
	const [scrolled, setScrolled] = useState(false);
	const { scrollY } = useScroll();

	useMotionValueEvent(scrollY, "change", (latest) => {
		const next = latest > 20;
		setScrolled((prev) => (prev === next ? prev : next));
	});

	return (
		<motion.header
			className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
				scrolled
					? "border-white/10 border-b bg-black/80 backdrop-blur-xl"
					: "bg-transparent"
			}`}
		>
			<div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6 lg:px-8">
				<Logo />
				{/* Desktop nav*/}
				<NavLinks className="hidden md:flex" />

				{/* Right */}
				<div className="flex items-center gap-2">
					<Link to="/login" className={cn(buttonVariants(), "gap-2")}>
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
