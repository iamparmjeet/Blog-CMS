import type { CSSProperties } from "react";
import type {
	ActivityLevel,
	WritingActivity,
	WritingActivityDay,
} from "#/features/writing-activity/writing.types";

interface WritingActivityHeatmapProps {
	accentColor: string;
	activity: WritingActivity;
}

const LEVEL_OPACITY: Record<ActivityLevel, number> = {
	0: 0,
	1: 0.3,
	2: 0.5,
	3: 0.72,
	4: 1,
};

export function WritingActivityHeatmap({
	accentColor,
	activity,
}: WritingActivityHeatmapProps) {
	const weeks = createCalendarWeeks(activity.days);

	return (
		<section
			aria-labelledby="writing-activity-heading"
			className="rounded-xl border border-border bg-card p-6"
		>
			<header className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<h2
						id="writing-activity-heading"
						className="font-semibold text-foreground"
					>
						Writing activity
					</h2>
					<p className="mt-1 text-sm text-muted-foreground">
						{activity.totalWordsAdded.toLocaleString("en-IN")} words added
						across {activity.activeDays} active days
					</p>
				</div>
				<p className="text-xs text-muted-foreground">{activity.timeZone}</p>
			</header>

			<div className="mt-6 overflow-x-auto pb-2">
				<div className="flex min-w-max gap-2">
					<div
						aria-hidden="true"
						className="grid grid-rows-7 gap-1 text-[10px] text-muted-foreground"
					>
						<span className="size-3" />
						<span className="h-3 leading-3">Mon</span>
						<span className="size-3" />
						<span className="h-3 leading-3">Wed</span>
						<span className="size-3" />
						<span className="h-3 leading-3">Fri</span>
						<span className="size-3" />
					</div>

					<div aria-hidden="true" className="flex gap-1">
						{weeks.map((week) => (
							<div key={getWeekKey(week)} className="grid grid-rows-7 gap-1">
								{week.map((day, dayIndex) =>
									day ? (
										<ActivityCell
											key={day.date}
											accentColor={accentColor}
											day={day}
										/>
									) : (
										<span
											// Calendar placeholders have stable weekday positions.
											// biome-ignore lint/suspicious/noArrayIndexKey: no component state can move between these empty cells.
											key={`empty-weekday-${dayIndex}`}
											className="size-3"
										/>
									),
								)}
							</div>
						))}
					</div>
				</div>
			</div>

			<footer className="mt-4 flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
				<p>
					{activity.totalWordsDeleted.toLocaleString("en-IN")} removed
					{" · "}net {activity.netWords.toLocaleString("en-IN")}
				</p>
				<div aria-hidden="true" className="flex items-center gap-1">
					<span className="mr-1">Less</span>
					{([0, 1, 2, 3, 4] as const).map((level) => (
						<span
							key={level}
							className="size-3 rounded-[3px] border border-border bg-muted"
							style={getCellStyle(level, accentColor)}
						/>
					))}
					<span className="ml-1">More</span>
				</div>
			</footer>

			<ul className="sr-only">
				{activity.days
					.filter((day) => day.wordsAdded > 0 || day.wordsDeleted > 0)
					.map((day) => (
						<li key={day.date}>{describeActivityDay(day)}</li>
					))}
			</ul>
		</section>
	);
}

function getWeekKey(week: readonly (WritingActivityDay | null)[]): string {
	return (
		week.find((day): day is WritingActivityDay => day !== null)?.date ??
		"empty-week"
	);
}

function ActivityCell({
	accentColor,
	day,
}: {
	accentColor: string;
	day: WritingActivityDay;
}) {
	return (
		<span
			title={describeActivityDay(day)}
			className="size-3 rounded-[3px] border border-border bg-muted"
			style={getCellStyle(day.level, accentColor)}
		/>
	);
}

function getCellStyle(
	level: ActivityLevel,
	accentColor: string,
): CSSProperties | undefined {
	if (level === 0) return undefined;
	return {
		backgroundColor: accentColor,
		opacity: LEVEL_OPACITY[level],
	};
}

function describeActivityDay(day: WritingActivityDay): string {
	return `${day.date}: ${day.wordsAdded} words added, ${day.wordsDeleted} removed, ${day.saveCount} saves`;
}

function createCalendarWeeks(
	days: readonly WritingActivityDay[],
): Array<Array<WritingActivityDay | null>> {
	const firstDay = days[0];
	if (!firstDay) return [];

	const leadingEmptyDays = new Date(
		`${firstDay.date}T00:00:00.000Z`,
	).getUTCDay();
	const cells: Array<WritingActivityDay | null> = [
		...Array.from({ length: leadingEmptyDays }, () => null),
		...days,
	];

	while (cells.length % 7 !== 0) cells.push(null);

	const weeks: Array<Array<WritingActivityDay | null>> = [];
	for (let index = 0; index < cells.length; index += 7) {
		weeks.push(cells.slice(index, index + 7));
	}
	return weeks;
}
