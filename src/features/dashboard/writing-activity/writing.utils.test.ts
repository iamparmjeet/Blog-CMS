import { describe, expect, it } from "vitest";
import {
	addDays,
	buildWritingActivityHeatmap,
	getActivityLevel,
	getDateKeyInTimeZone,
	getHeatmapStartDate,
	resolveTimeZone,
} from "./writing.utils";

describe("resolveTimeZone", () => {
	it("keeps valid time zones and falls back to UTC for junk", () => {
		expect(resolveTimeZone("Asia/Kolkata")).toBe("Asia/Kolkata");
		expect(resolveTimeZone(null)).toBe("UTC");
		expect(resolveTimeZone(undefined)).toBe("UTC");
		expect(resolveTimeZone("Not/AZone")).toBe("UTC");
	});
});

describe("getDateKeyInTimeZone", () => {
	it("returns the calendar date for the owner time zone", () => {
		expect(
			getDateKeyInTimeZone(new Date("2026-09-20T18:30:00.000Z"), "UTC"),
		).toBe("2026-09-20");
		expect(
			getDateKeyInTimeZone(
				new Date("2026-09-20T18:30:00.000Z"),
				"Asia/Kolkata",
			),
		).toBe("2026-09-21");
		expect(
			getDateKeyInTimeZone(
				new Date("2026-09-20T02:30:00.000Z"),
				"America/New_York",
			),
		).toBe("2026-09-19");
	});

	it("crosses midnight differently per zone for the same instant", () => {
		const nearMidnightUtc = new Date("2026-09-21T00:30:00.000Z");

		expect(getDateKeyInTimeZone(nearMidnightUtc, "UTC")).toBe("2026-09-21");
		expect(getDateKeyInTimeZone(nearMidnightUtc, "Asia/Kolkata")).toBe(
			"2026-09-21",
		);
		expect(getDateKeyInTimeZone(nearMidnightUtc, "America/Los_Angeles")).toBe(
			"2026-09-20",
		);
	});
});

describe("addDays / getHeatmapStartDate", () => {
	it("adds days across month boundaries", () => {
		expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
		expect(addDays("2026-10-01", -1)).toBe("2026-09-30");
	});

	it("starts the 12-week window eleven weeks before the current week's Sunday", () => {
		// 2026-09-20 is a Sunday; 12 week columns end Saturday 2026-09-26.
		expect(getHeatmapStartDate("2026-09-20")).toBe("2026-07-05");
		// 2026-09-22 is a Tuesday; same week-aligned window.
		expect(getHeatmapStartDate("2026-09-22")).toBe("2026-07-05");
	});
});

describe("getActivityLevel", () => {
	it("buckets word counts into five levels", () => {
		expect(getActivityLevel(0)).toBe(0);
		expect(getActivityLevel(50)).toBe(1);
		expect(getActivityLevel(150)).toBe(2);
		expect(getActivityLevel(500)).toBe(3);
		expect(getActivityLevel(1000)).toBe(4);
	});
});

describe("buildWritingActivityHeatmap", () => {
	it("builds a week-aligned 12-week grid through the current week and marks future cells", () => {
		const heatmap = buildWritingActivityHeatmap({
			rows: [
				{ activityDate: "2026-07-05", wordsAdded: 120 },
				{ activityDate: "2026-09-20", wordsAdded: 400 },
			],
			today: "2026-09-22",
			timeZone: "Asia/Kolkata",
		});

		expect(heatmap.cells).toHaveLength(84);
		expect(heatmap.startDate).toBe("2026-07-05");
		expect(heatmap.today).toBe("2026-09-22");
		expect(heatmap.endDate).toBe("2026-09-26");
		expect(heatmap.timeZone).toBe("Asia/Kolkata");
		expect(heatmap.totalWordsAdded).toBe(520);
		expect(heatmap.activeDays).toBe(2);

		const futureCells = heatmap.cells.filter((cell) => cell.isFuture);
		expect(futureCells.length).toBeGreaterThan(0);
		expect(futureCells.every((cell) => cell.wordsAdded === 0)).toBe(true);

		const startCell = heatmap.cells[0];
		expect(startCell).toEqual({
			date: "2026-07-05",
			isFuture: false,
			level: 2,
			wordsAdded: 120,
		});

		const todayCell = heatmap.cells.find((cell) => cell.date === "2026-09-22");
		expect(todayCell).toEqual({
			date: "2026-09-22",
			isFuture: false,
			level: 0,
			wordsAdded: 0,
		});
	});

	it("keeps future words at zero even when rows claim them", () => {
		const heatmap = buildWritingActivityHeatmap({
			rows: [{ activityDate: "2026-09-25", wordsAdded: 999 }],
			today: "2026-09-22",
			timeZone: "UTC",
		});

		expect(heatmap.totalWordsAdded).toBe(0);
		expect(heatmap.activeDays).toBe(0);
	});
});
