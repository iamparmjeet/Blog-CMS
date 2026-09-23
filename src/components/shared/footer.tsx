import { useInView } from "motion/react";
import { useRef } from "react";
import { Year } from "#/lib/date";
import { Logo } from "./logo";
import { NavLinks } from "./nav-links";

export function Footer() {
	const brandRef = useRef<HTMLDivElement>(null);
	const brandIsVisible = useInView(brandRef, { amount: 0.2 });

	return (
		<footer className="border-border/50 border-t bg-background">
			<div className="mx-auto flex max-w-7xl flex-col gap-8 pt-8">
				{/* Row -1 */}
				<div className="flex items-center justify-between">
					{/* Logo */}
					<div ref={brandRef}>
						<Logo animated={brandIsVisible} loop markClassName="size-11" />
						<p className="mt-2 text-muted-foreground text-sm">
							Write once. Ship everywhere.
						</p>
					</div>

					{/* Navigation */}

					<NavLinks className="gap-6" />
				</div>
				{/* Row-2*/}
				<div className="flex items-center justify-between border-neutral-800 border-t py-8">
					<div className="text-center text-muted-foreground text-sm">
						<p>
							&copy; {Year()} PageOwl. All rights reserved. | Made by{" "}
							<a
								target="_blank"
								href={"https://parmjeetmishra.com"}
								rel="noopener"
							>
								Parm
							</a>
						</p>
					</div>
					{/* Copyright */}
					<div className="text-muted-foreground text-sm">
						<span className="mx-2">•</span>
						Built in public
						<span className="mx-2">•</span>
						MIT License
					</div>
				</div>
			</div>
		</footer>
	);
}
