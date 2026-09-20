import { NewDraftButton } from "#/features/posts/components/new-draft-button";
import { getGreeting } from "../functions/dashboard.utils";

interface DashboardHeaderProps {
	firstName: string;
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
	day: "numeric",
	month: "long",
	weekday: "long",
});

export function DashboardHeader({ firstName }: DashboardHeaderProps) {
	const now = new Date();

	return (
		<header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
			<div>
				<h1 className="font-semibold text-[22px] text-text-primary tracking-[-0.02em]">
					{getGreeting(now)}, {firstName}
				</h1>
				<p className="mt-1.5 text-[13px] text-text-muted">
					{dateFormatter.format(now)}
				</p>
			</div>

			<NewDraftButton />
		</header>
	);
}
