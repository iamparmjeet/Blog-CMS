export type AnalyticsRange = "7d" | "30d" | "90d";

export interface DailyView {
	date: string;
	views: number;
}

export interface BarItem {
	label: string;
	value: number;
}

export interface TopPage {
	path: string;
	title: string;
	views: number;
}

export interface AnalyticsView {
	browsers: BarItem[];
	countries: BarItem[];
	daily: DailyView[];
	devices: BarItem[];
	operatingSystems: BarItem[];
	referrers: BarItem[];
	topPages: TopPage[];
}
