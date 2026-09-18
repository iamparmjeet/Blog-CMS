import type {
	ActivityLevel,
	WritingActivityHeatmap as WritingActivityHeatmapData,
} from "../writing-activity/writing.types";
import { SectionLabel } from "./label";

interface WritingActivityHeatmapProps {
	data: WritingActivityHeatmapData;
}

const LEGEND_LEVELS = [0, 1, 2, 3, 4] as const;

// const LEVEL_CLASSES = [
// 	"bg-purple-700/10",
// 	"bg-purple-700/20",
// 	"bg-purple-700/40",
// 	"bg-purple-700/70",
// 	"bg-purple-700",
// ] as const satisfies readonly [string, string, string, string, string];

const LEVEL_CLASSES: Record<ActivityLevel, string> = {
	0: "bg-[#171717]",
	1: "bg-violet-950",
	2: "bg-violet-800",
	3: "bg-violet-600",
	4: "bg-violet-500",
};

const numberFormatter = new Intl.NumberFormat("en-IN");

// ********* Main component ***********
export function Heatmap({ data }: WritingActivityHeatmapProps) {
	return (
		<section
			className="min-w-0"
			aria-label={`Writing activity for the last 12 weeks: ${data.totalWordsAdded.toLocaleString()} words added across ${data.activeDays} active days`}
		>
			<SectionLabel>Writing activity · last 12 weeks</SectionLabel>
			<HeatmapHeader totalWordsAdded={data.totalWordsAdded} />

			{/* Cells */}
			<div className="flex gap-2 overflow-x-auto pb-2">
				<div className="flex w-max grid-cols-[12px_auto] gap-2">
					<div
						className="grid grid-rows-7 gap-1 text-[9px] text-text-muted leading-3"
						aria-hidden="true"
					>
						<span />
						<span>M</span>
						<span />
						<span>W</span>
						<span />
						<span>F</span>
						<span />
					</div>
				</div>
				{/* biome-ignore lint/a11y/useSemanticElements: calendar heatmap, not tabular data; explicit grid role with row/col counts is deliberate. */}
				<div
					role="grid"
					aria-label="Writing activity for the last 12 weeks"
					aria-rowcount={7}
					aria-colcount={Math.ceil(data.cells.length / 7)}
					className="grid w-max grid-flow-col grid-rows-7 gap-1.5"
				>
					{data.cells.map((cell) => {
						const label = formatCellLabel(cell.date, cell.wordsAdded);

						return (
							<span
								key={cell.date}
								title={cell.isFuture ? undefined : label}
								aria-hidden="true"
								className={[
									"size-3 rounded-[3px]",
									cell.isFuture ? "bg-transparent" : LEVEL_CLASSES[cell.level],
								].join(" ")}
							/>
						);
					})}
				</div>
			</div>
			<footer>
				<span>Less</span>
				<div>
					{LEGEND_LEVELS.map((level) => (
						<span
							key={level}
							className={`size-3 rounded-[3px] ${LEVEL_CLASSES[level]}`}
						/>
					))}
				</div>
				<span className="text-[11px] text-text-muted">More</span>
			</footer>
		</section>
	);
}

// ******** Supporting components ***********
function HeatmapHeader({ totalWordsAdded }: { totalWordsAdded: number }) {
	return (
		<header className="mb-5 flex items-start justify-between gap-4">
			<div>
				<p className="mt-1 text-text-muted text-xs">
					Words added during the last 12 weeks
				</p>
			</div>

			<p className="text-text-secondary text-xs">
				{numberFormatter.format(totalWordsAdded)} words
			</p>
		</header>
	);
}

function formatCellLabel(dateKey: string, wordsAdded: number): string {
	const date = new Date(`${dateKey}T00:00:00.000Z`);

	const formattedDate = new Intl.DateTimeFormat("en-IN", {
		dateStyle: "medium",
		timeZone: "UTC",
	}).format(date);

	return `${formattedDate}: ${wordsAdded.toLocaleString()} ${
		wordsAdded === 1 ? "word" : "words"
	} added`;
}
