import { IconBrandGithub } from "@tabler/icons-react";
import type { ElementType } from "react";
import { cn } from "#/lib/utils";

interface NavLink {
	href: string;
	label: string;
	icon?: ElementType;
	external?: boolean;
}

const LINKS: NavLink[] = [
	{ href: "#features", label: "Features" },
	{ href: "#repurpose", label: "Repurpose" },
	{ href: "#how", label: "How it Works" },
	{
		href: "https://github.com/iamparmjeet/blog-cms",
		label: "GitHub",
		icon: IconBrandGithub,
		external: true,
	},
];

interface NavLinksProps {
	activeSection?: string;
	className?: string;
}
export function NavLinks({ activeSection, className }: NavLinksProps) {
	return (
		<nav className={cn("flex items-center gap-8 text-sm", className)}>
			{LINKS.map((link) => {
				const isActive = activeSection === link.href;

				return (
					<a
						key={link.href}
						href={link.href}
						target={link.external ? "_blank" : undefined}
						className={cn(
							"relative inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-violet-400",
							isActive && "text-violet-400",
						)}
					>
						{link.icon && <link.icon className="size-4" />}
						{link.label}
					</a>
				);
			})}
		</nav>
	);
}
