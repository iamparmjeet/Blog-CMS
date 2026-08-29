import type { HeatmapCell } from "./heatmap.types";

export const HEATMAP_DAY_COUNT = 84;

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

interface BuildHeatmapDateWindowOptions {
	/**
	 * Inclusive final date in YYYY-MM-DD format.
	 */
	endDateKey: string;

	locale?: string;
}

function parseDateKey(dateKey: string): Date {
	const match = DATE_KEY_PATTERN.exec(dateKey);

	if (!match) {
		throw new RangeError(`Invalid date key "${dateKey}". Expected YYYY-MM-DD.`);
	}

	const [, yearPart, monthPart, dayPart] = match;

	const year = Number(yearPart);
	const month = Number(monthPart);
	const day = Number(dayPart);

	const date = new Date(Date.UTC(year, month - 1, day));

	const isValidCalendarDate =
		date.getUTCFullYear() === year &&
		date.getUTCMonth() === month - 1 &&
		date.getUTCDate() === day;

	if (!isValidCalendarDate) {
		throw new RangeError(`Invalid calendar date "${dateKey}".`);
	}

	return date;
}

function formatDateKey(date: Date): string {
	const year = String(date.getUTCFullYear()).padStart(4, "0");
	const month = String(date.getUTCMonth() + 1).padStart(2, "0");
	const day = String(date.getUTCDate()).padStart(2, "0");

	return `${year}-${month}-${day}`;
}

/**
 * Produces exactly 84 consecutive days, ending on endDateKey.
 *
 * UTC is used only as a safe calendar-arithmetic mechanism. These values
 * represent date-only keys, not real UTC timestamps.
 */
export function buildHeatmapDateWindow({
	endDateKey,
	locale = "en-IN",
}: BuildHeatmapDateWindowOptions): readonly HeatmapCell[] {
	const endDate = parseDateKey(endDateKey);

	const dateLabelFormatter = new Intl.DateTimeFormat(locale, {
		year: "numeric",
		month: "long",
		day: "numeric",
		timeZone: "UTC",
	});

	return Array.from({ length: HEATMAP_DAY_COUNT }, (_, index) => {
		const daysBeforeEnd = HEATMAP_DAY_COUNT - index - 1;

		const date = new Date(endDate);
		date.setUTCDate(endDate.getUTCDate() - daysBeforeEnd);

		return {
			id: formatDateKey(date),
			dateLabel: dateLabelFormatter.format(date),
			wordsAdded: 0,
			level: 0,
		};
	});
}
