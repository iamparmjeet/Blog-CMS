import { IconArrowRight, IconMenu } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Logo } from "./logo";
import { NavLinks } from "./nav-links";

export function Header() {
	const [scrolled, setScrolled] = useState(false);

	useEffect(() => {
		const onScroll = () => {
			setScrolled(window.scrollY > 20);
		};

		onScroll();

		window.addEventListener("scroll", onScroll);

		return () => window.removeEventListener("scroll", onScroll);
	}, []);
	return (
		<header
			className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
				scrolled
					? "border-b border-white/10 bg-black/80 backdrop-blur-xl"
					: "bg-transparent"
			}`}
		>
			<div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6 lg:px-8">
				<Logo />
				{/* Desktop nav*/}
				<NavLinks className="hidden md:flex" />

				{/* Right */}
				<div className="flex items-center gap-2">
					<Button>
						<Link to="/login" className={"inline-flex items-center gap-2"}>
							Sign In
							<IconArrowRight className="size-4" />
						</Link>
					</Button>
					<Button variant="ghost" size="icon" className="md:hidden">
						<IconMenu className="h-5 w-5" />
					</Button>
				</div>
			</div>
		</header>
	);
}
