import { IconFileText, IconHome, IconSettings } from "@tabler/icons-react";
import { Logo } from "#/components/shared/logo";
import { cn } from "#/lib/utils";

const NAV_ITEMS = [
	{ icon: IconHome, label: "Home" },
	{ icon: IconFileText, label: "Posts", active: true, count: 5 },
	{ icon: IconSettings, label: "Settings" },
];

export function Sidebar({ className }: { className?: string }) {
	return (
		<aside
			className={cn(
				"flex h-full flex-col border-border border-r bg-sidebar",
				className,
			)}
		>
			{/* Logo */}
			<div className="flex items-center gap-2.5 border-border border-b px-4 py-3.5">
				<Logo className="text-sidebar-foreground" size="sm" />
			</div>

			{/* Nav */}
			<nav className="space-y-0.5 p-2.5">
				{NAV_ITEMS.map(({ icon: Icon, label, active, count }) => (
					<div
						key={label}
						className={`flex items-center justify-between gap-2 rounded-md px-3 py-2 text-xs ${active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground"}`}
					>
						<div className="flex items-center gap-2">
							<Icon className="size-4" />
							<span>{label}</span>
						</div>
						{count && (
							<span className="text-[11px] text-muted-foreground">{count}</span>
						)}
					</div>
				))}
			</nav>

			{/* Active Post Info */}
			<div className="border-border border-t p-3">
				<p className="mb-2 font-medium text-[10px] text-foreground leading-snug">
					This post
				</p>
				<div className="rounded-md border border-border bg-card p-3">
					<p className="font-medium text-[10px] text-foreground leading-snug">
						Why I ditched Notion for a Custom CMS
					</p>
					<p className="mt-1 font-mono text-[10px] text-muted-foreground">
						/why-i-ditched-notion
					</p>
					<div className="mt-3 flex items-center justify-between">
						<span className="text-[11px] text-muted-foreground">Draft</span>
						<span className="text-[10px] text-muted-foreground">
							Not Published
						</span>
					</div>
				</div>

				{/* Settings */}
				<div className="mt-auto flex items-center gap-2 border-border border-t px-3 py-3">
					<div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand font-semibold text-[9px] text-brand-foreground">
						AM
					</div>
					<span className="text-muted-foreground text-xs">Alex Morgan</span>
				</div>
			</div>
		</aside>
	);
}
