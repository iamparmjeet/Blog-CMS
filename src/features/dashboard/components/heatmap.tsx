import { formatNumber } from "#/lib/number";
import { hexToRgba } from "#/lib/utils";
import type {
	ActivityLevel,
	WritingActivityHeatmap as WritingActivityHeatmapData,
} from "../writing-activity/writing.types";
import { SectionLabel } from "./label";

interface HeatmapProps {
	accentColor: string;
	data: WritingActivityHeatmapData;
}

const LEVEL_ALPHAS: Record<ActivityLevel, number> = {
	0: 0,
	1: 0.15,
	2: 0.4,
	3: 0.72,
	4: 1,
};

const LEGEND_LEVELS = [0, 1, 2, 3, 4] as const;
const DAY_LABELS = [
	{ key: "sunday", label: "" },
	{ key: "monday", label: "M" },
	{ key: "tuesday", label: "" },
	{ key: "wednesday", label: "W" },
	{ key: "thursday", label: "" },
	{ key: "friday", label: "F" },
	{ key: "saturday", label: "" },
] as const;

function getCellBackground(accentColor: string, level: ActivityLevel): string {
	if (level === 0) {
		return "var(--border-subtle)";
	}

	return hexToRgba(accentColor, LEVEL_ALPHAS[level]);
}

export function Heatmap({ accentColor, data }: HeatmapProps) {
	const columns = Math.ceil(data.cells.length / 7);

	return (
		<section
			aria-label={`Writing activity for the last 12 weeks: ${data.totalWordsAdded.toLocaleString()} words added across ${data.activeDays} active days`}
		>
			<SectionLabel>Writing activity · last 12 weeks</SectionLabel>

			<header className="mt-3 mb-4 flex items-start justify-between gap-4">
				<p className="text-text-muted text-xs">
					Words added during the last 12 weeks
				</p>
				<p className="text-text-secondary text-xs tabular-nums">
					{formatNumber(data.totalWordsAdded)} words
				</p>
			</header>

			<div className="flex gap-2 overflow-x-auto pb-2">
				<div
					aria-hidden="true"
					className="grid shrink-0 grid-rows-7 gap-0.5 text-[9px] text-text-muted"
				>
					{DAY_LABELS.map((day) => (
						<span
							className="flex h-[11px] items-center leading-none"
							key={day.key}
						>
							{day.label}
						</span>
					))}
				</div>

				{/* biome-ignore lint/a11y/useSemanticElements: calendar heatmap, not tabular data; explicit grid role with row/col counts is deliberate. */}
				<div
					aria-colcount={columns}
					aria-label="Writing activity for the last 12 weeks"
					aria-rowcount={7}
					className="grid w-max grid-flow-col grid-rows-7 gap-0.5"
					role="grid"
				>
					{data.cells.map((cell) => (
						<span
							aria-hidden="true"
							className="size-[11px] rounded-[2px]"
							key={cell.date}
							style={{
								background: cell.isFuture
									? "transparent"
									: getCellBackground(accentColor, cell.level),
							}}
							title={cell.isFuture ? undefined : formatCellLabel(cell)}
						/>
					))}
				</div>
			</div>

			<footer className="mt-2 flex items-center gap-1.5">
				<span className="text-[11px] text-text-muted">Less</span>
				{LEGEND_LEVELS.map((level) => (
					<span
						className="size-[11px] rounded-[2px]"
						key={level}
						style={{ background: getCellBackground(accentColor, level) }}
					/>
				))}
				<span className="text-[11px] text-text-muted">More</span>
			</footer>
		</section>
	);
}

function formatCellLabel(cell: { date: string; wordsAdded: number }): string {
	const formattedDate = new Intl.DateTimeFormat("en-US", {
		dateStyle: "medium",
		timeZone: "UTC",
	}).format(new Date(`${cell.date}T00:00:00.000Z`));

	return `${formattedDate}: ${cell.wordsAdded.toLocaleString()} ${
		cell.wordsAdded === 1 ? "word" : "words"
	} added`;
}
