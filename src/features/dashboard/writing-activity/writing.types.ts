export type ActivityLevel = 0 | 1 | 2 | 3 | 4;

export interface WritingActivityRow {
	activityDate: string;
	wordsAdded: number;
}

export interface ActivityCell {
	date: string;
	wordsAdded: number;
	level: ActivityLevel;
	isFuture: boolean;
}

export interface WritingActivityHeatmap {
	today: string;
	startDate: string;
	endDate: string;
	timeZone: string;
	totalWordsAdded: number;
	activeDays: number;
	cells: ActivityCell[];
}
