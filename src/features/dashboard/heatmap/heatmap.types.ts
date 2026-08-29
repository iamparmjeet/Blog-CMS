export type LEGEND_LEVELS = 0 | 1 | 2 | 3 | 4;

export interface HeatmapCell {
	/**
	 * Calendar-date identity in YYYY-MM-DD format.
	 */
	id: string;

	/**
	 * Human-readable date shown to users.
	 * Example: "24 July 2026".
	 */
	dateLabel: string;

	/**
	 * Positive words added during this calendar day.
	 */
	wordsAdded: number;

	/**
	 * Display intensity from empty to highest activity.
	 */
	level: LEGEND_LEVELS;
}
