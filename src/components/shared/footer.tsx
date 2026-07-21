import { Year } from "#/lib/date";
import { Logo } from "./logo";
import { NavLinks } from "./nav-links";

export function Footer() {
	return (
		<footer className="border-t border-border/50 bg-black">
			<div className="mx-auto flex flex-col max-w-7xl gap-8 pt-8">
				{/* Row -1 */}
				<div className="flex items-center justify-between">
					{/* Logo */}
					<div>
						<Logo />
						<p className="mt-2 text-sm text-muted-foreground">
							Write once. Ship everywhere.
						</p>
					</div>

					{/* Navigation */}

					<NavLinks className="gap-6" />
				</div>
				{/* Row-2*/}
				<div className="flex items-center justify-between py-8 border-t border-neutral-800">
					<div className=" text-center text-muted-foreground text-sm">
						<p>
							&copy; {Year()} contentOS. All rights reserved. | Made with ♡ by{" "}
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
					<div className="text-sm text-muted-foreground">
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
