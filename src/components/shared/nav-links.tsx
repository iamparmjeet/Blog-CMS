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
	{ href: "/demo", label: "Live demo" },
	{
		href: "https://github.com/iamparmjeet/PageOwl",
		label: "GitHub",
		icon: IconBrandGithub,
		external: true,
	},
];

interface NavLinksProps {
	activeSection?: string;
	className?: string;
	itemClassName?: string;
	onNavigate?: () => void;
}
export function NavLinks({
	activeSection,
	className,
	itemClassName,
	onNavigate,
}: NavLinksProps) {
	return (
		<nav className={cn("flex items-center gap-8 text-sm", className)}>
			{LINKS.map((link) => {
				const isActive = activeSection === link.href;

				return (
					<a
						key={link.href}
						href={link.href}
						target={link.external ? "_blank" : undefined}
						onClick={onNavigate}
						className={cn(
							"relative inline-flex items-center gap-1.5 text-muted-foreground text-sm transition-colors hover:text-brand",
							isActive && "text-brand",
							itemClassName,
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
