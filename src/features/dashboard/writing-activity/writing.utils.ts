import type {
	ActivityCell,
	ActivityLevel,
	WritingActivityHeatmap,
	WritingActivityRow,
} from "./writing.types";

const DAYS_PER_WEEK = 7;
const WEEKS = 12;
const CELL_COUNT = DAYS_PER_WEEK * WEEKS;

export function getActivityLevel(wordsAdded: number): ActivityLevel {
	if (wordsAdded <= 0) return 0;
	if (wordsAdded < 100) return 1;
	if (wordsAdded < 300) return 2;
	if (wordsAdded < 700) return 3;

	return 4;
}

export function resolveTimeZone(timeZone: string | null | undefined): string {
	if (!timeZone) return "UTC";

	try {
		new Intl.DateTimeFormat("en", { timeZone }).format(new Date());
		return timeZone;
	} catch {
		return "UTC";
	}
}

export function getDateKeyInTimeZone(date: Date, timeZone: string): string {
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(date);

	const year = parts.find((part) => part.type === "year")?.value;
	const month = parts.find((part) => part.type === "month")?.value;
	const day = parts.find((part) => part.type === "day")?.value;

	if (!year || !month || !day) {
		throw new Error("Could not generate activity date");
	}

	return `${year}-${month}-${day}`;
}

export function addDays(dateKey: string, amount: number): string {
	const date = parseDateKey(dateKey);
	date.setUTCDate(date.getUTCDate() + amount);

	return date.toISOString().slice(0, 10);
}

export function getHeatmapStartDate(today: string): string {
	const currentDay = parseDateKey(today).getUTCDay();

	// Move to Sunday of the current week, then back another 11 weeks.
	return addDays(today, -(currentDay + (WEEKS - 1) * DAYS_PER_WEEK));
}

export function buildWritingActivityHeatmap(input: {
	rows: WritingActivityRow[];
	today: string;
	timeZone: string;
}): WritingActivityHeatmap {
	const startDate = getHeatmapStartDate(input.today);
	const wordsByDate = new Map(
		input.rows.map((row) => [row.activityDate, row.wordsAdded]),
	);

	const cells: ActivityCell[] = Array.from(
		{ length: CELL_COUNT },
		(_, index) => {
			const date = addDays(startDate, index);
			const isFuture = date > input.today;
			const wordsAdded = isFuture ? 0 : (wordsByDate.get(date) ?? 0);

			return {
				date,
				wordsAdded,
				level: getActivityLevel(wordsAdded),
				isFuture,
			};
		},
	);

	const visibleCells = cells.filter((cell) => !cell.isFuture);

	return {
		today: input.today,
		startDate,
		endDate: cells.at(-1)?.date ?? input.today,
		timeZone: input.timeZone,
		totalWordsAdded: visibleCells.reduce(
			(total, cell) => total + cell.wordsAdded,
			0,
		),
		activeDays: visibleCells.filter((cell) => cell.wordsAdded > 0).length,
		cells,
	};
}

function parseDateKey(dateKey: string): Date {
	const date = new Date(`${dateKey}T00:00:00.000Z`);

	if (Number.isNaN(date.getTime())) {
		throw new Error(`Invalid date key: ${dateKey}`);
	}

	return date;
}
