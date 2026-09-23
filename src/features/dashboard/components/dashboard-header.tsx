import { NewDraftButton } from "#/features/posts/components/new-draft-button";
import { getGreeting } from "../functions/dashboard.utils";

interface DashboardHeaderProps {
	firstName: string;
	onCreateDraft?: () => void;
	timeZone: string;
}

function createDateFormatter(timeZone: string): Intl.DateTimeFormat {
	return new Intl.DateTimeFormat("en-US", {
		day: "numeric",
		month: "long",
		timeZone,
		weekday: "long",
	});
}

export function DashboardHeader({
	firstName,
	onCreateDraft,
	timeZone,
}: DashboardHeaderProps) {
	const now = new Date();
	const dateFormatter = createDateFormatter(timeZone);

	return (
		<header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
			<div>
				<p className="mb-2 font-medium text-[11px] text-accent-soft uppercase tracking-[0.08em]">
					Your writing desk
				</p>
				<h1 className="font-semibold text-[28px] text-text-primary leading-tight tracking-[-0.035em] sm:text-[32px]">
					{getGreeting(now, timeZone)}, {firstName}
				</h1>
				<p className="mt-2 text-[13px] text-text-soft">
					{dateFormatter.format(now)}
				</p>
			</div>

			<NewDraftButton onCreate={onCreateDraft} />
		</header>
	);
}
