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
			<div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
				{/* Row -1 */}
				<div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
					{/* Logo */}
					<div ref={brandRef}>
						<Logo animated={brandIsVisible} loop markClassName="size-11" />
						<p className="mt-3 max-w-xs text-muted-foreground text-sm">
							Write once. Ship everywhere.
						</p>
					</div>

					{/* Navigation */}

					<NavLinks className="flex-wrap gap-x-6 gap-y-3 sm:pt-3" />
				</div>

				{/* Row-2*/}
				<div className="mt-10 flex flex-col gap-3 border-border border-t py-6 text-muted-foreground text-sm sm:flex-row sm:items-center sm:justify-between sm:py-8">
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
					{/* Copyright */}
					<div className="flex items-center gap-2">
						<span>Built in public</span>
						<span aria-hidden="true">•</span>
						<span>MIT License</span>
					</div>
				</div>
			</div>
		</footer>
	);
}
