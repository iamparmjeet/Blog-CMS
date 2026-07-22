import { IconFileText, IconHome, IconSettings } from "@tabler/icons-react";
import { Logo } from "#/components/shared/logo";

const NAV_ITEMS = [
	{ icon: IconHome, label: "Home" },
	{ icon: IconFileText, label: "Posts", active: true, count: 5 },
	{ icon: IconSettings, label: "Settings" },
];

export function Sidebar() {
	return (
		<aside className="flex h-full flex-col border-r border-white/5 bg-zinc-950">
			{/* Logo */}
			<div className="flex items-center gap-2.5 border-b border-white/5 px-4 py-3.5">
				<Logo size="sm" />
			</div>

			{/* Nav */}
			<nav className="space-y-0.5 p-2.5">
				{NAV_ITEMS.map(({ icon: Icon, label, active, count }) => (
					<div
						key={label}
						className={`flex justify-between items-center gap-2 rounded-md px-3 py-2 text-xs ${active ? "bg-white/5 text-zinc-200" : "text-zinc-500"}`}
					>
						<div className="flex items-center gap-2">
							<Icon className="size-4" />
							<span>{label}</span>
						</div>
						{count && (
							<span className="text-[11px] text-zinc-600">{count}</span>
						)}
					</div>
				))}
			</nav>

			{/* Active Post Info */}
			<div className="border-t border-white/5 p-3">
				<p className="mb-2 text-[10px] font-medium text-zinc-300 leading-snug">
					This post
				</p>
				<div className="rounded-md border border-white/5 bg-white/3 p-3">
					<p className="text-[10px] font-medium text-zinc-300 leading-snug">
						Why I ditched Notion for a Custom CMS
					</p>
					<p className="mt-1 font-mono text-[10px] text-zinc-600">
						/why-i-diteched-notion
					</p>
					<div className="mt-3 flex items-center justify-between">
						<span className="text-[11px] text-zinc-500">Draft</span>
						<span className="text-[10px] text-zinc-600">Not Published</span>
					</div>
				</div>

				{/* Settings */}
				<div className="mt-auto flex items-center gap-2 border-t border-white/5 px-3 py-3">
					<div className="flex h-6 w-6 items-center justify-center rounded-full bg-linear-to-br from-violet-600 to-indigo-600 text-[9px] font-semibold text-white">
						AM
					</div>
					<span className="text-xs text-zinc-500">Alex Morgan</span>
				</div>
			</div>
		</aside>
	);
}
