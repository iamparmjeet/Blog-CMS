import { IconArrowRight } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { DashboardData } from "../functions/dashboard.types";

interface HeaderProps {
	firstName: string;
	data: DashboardData;
}

export function DashboardHeader({ firstName, data }: HeaderProps) {
	return (
		<header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
			<div>
				<p
					className="mb-2 font-medium text-sm"
					style={{ color: data.accentColor }}
				>
					Dashboard
				</p>
				<h1 className="font-semibold text-3xl tracking-tight">
					Welcome back, {firstName}
				</h1>
				<p className="mt-2 text-muted-foreground text-sm">
					Here is an overview of your current writing.
				</p>
			</div>

			<Link
				to="/posts"
				className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-card px-4 font-medium text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			>
				Manage Posts <IconArrowRight className="size-4" />
			</Link>
		</header>
	);
}
