import type { AnalyticsView, DailyView } from "./analytics.types";

function buildDailyViews(days: number): DailyView[] {
	return Array.from({ length: days }, (_, index) => {
		const date = new Date();
		date.setDate(date.getDate() - (days - 1 - index));

		const weekday = date.getDay();
		const weekendFactor = weekday === 0 || weekday === 6 ? 0.55 : 1;
		const wave = Math.sin(index / 3.4) * 0.35 + Math.cos(index / 7.1) * 0.2;
		const views = Math.max(40, Math.round((180 + wave * 120) * weekendFactor));

		return { date: date.toISOString().slice(0, 10), views };
	});
}

const daily = buildDailyViews(90);

export const DEMO_ANALYTICS: AnalyticsView = {
	browsers: [
		{ label: "Chrome", value: 3912 },
		{ label: "Safari", value: 1841 },
		{ label: "Firefox", value: 702 },
		{ label: "Edge", value: 388 },
		{ label: "Other", value: 214 },
	],
	countries: [
		{ label: "India", value: 3201 },
		{ label: "United States", value: 1442 },
		{ label: "United Kingdom", value: 961 },
		{ label: "Germany", value: 640 },
		{ label: "Other", value: 1909 },
	],
	daily,
	devices: [
		{ label: "Desktop", value: 4820 },
		{ label: "Mobile", value: 1936 },
		{ label: "Tablet", value: 301 },
	],
	operatingSystems: [
		{ label: "Linux", value: 2410 },
		{ label: "macOS", value: 1874 },
		{ label: "Windows", value: 1398 },
		{ label: "Android", value: 902 },
		{ label: "iOS", value: 473 },
	],
	referrers: [
		{ label: "Direct", value: 1923 },
		{ label: "Google", value: 1442 },
		{ label: "X / Twitter", value: 961 },
		{ label: "LinkedIn", value: 720 },
		{ label: "Hacker News", value: 481 },
	],
	topPages: [
		{
			path: "/posts/building-in-public-90-days",
			title: "Building in Public: 90 Days of Shipping",
			views: 2847,
		},
		{
			path: "/posts/why-i-ditched-notion",
			title: "Why I Ditched Notion for a Custom CMS",
			views: 1204,
		},
		{
			path: "/posts/ai-tools-i-actually-use",
			title: "AI Tools I Actually Use (and ones I dropped)",
			views: 891,
		},
		{
			path: "/posts/async-first-workflow",
			title: "The Async-First Workflow That Changed How I Work",
			views: 654,
		},
	],
};
