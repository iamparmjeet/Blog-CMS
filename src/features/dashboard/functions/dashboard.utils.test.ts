import { describe, expect, it } from "vitest";
import type {
	ActivityCell,
	WritingActivityHeatmap,
} from "../writing-activity/writing.types";
import {
	buildDashboardData,
	type DashboardPostRow,
	DEFAULT_ACCENT_COLOR,
	getGreeting,
	normalizeAccentColor,
	summarizeActivity,
} from "./dashboard.utils";

function createPost(
	overrides: Partial<DashboardPostRow> = {},
): DashboardPostRow {
	return {
		id: 1,
		title: "Test post",
		status: "draft",
		wordCount: 500,
		updatedAt: new Date("2026-07-20T10:00:00.000Z"),
		...overrides,
	};
}

describe("buildDashboardData", () => {
	it("returns empty dashboard data when there are no posts", () => {
		const result = buildDashboardData([], undefined);

		expect(result).toEqual({
			accentColor: DEFAULT_ACCENT_COLOR,
			stats: {
				totalWords: 0,
				totalPosts: 0,
				publishedPosts: 0,
				draftPosts: 0,
			},
			continuePost: null,
			recentPosts: [],
		});
	});

	it("calculates total words and post counts", () => {
		const result = buildDashboardData(
			[
				createPost({
					id: 1,
					status: "draft",
					wordCount: 400,
				}),
				createPost({
					id: 2,
					status: "published",
					wordCount: 600,
				}),
				createPost({
					id: 3,
					status: "scheduled",
					wordCount: 250,
				}),
			],
			"#2563eb",
		);

		expect(result.stats).toEqual({
			totalWords: 1_250,
			totalPosts: 3,
			publishedPosts: 1,
			draftPosts: 1,
		});
	});

	it("selects the most recently updated draft", () => {
		const result = buildDashboardData(
			[
				createPost({
					id: 1,
					title: "Older draft",
					updatedAt: new Date("2026-07-18T10:00:00.000Z"),
				}),
				createPost({
					id: 2,
					title: "Newest draft",
					updatedAt: new Date("2026-07-22T10:00:00.000Z"),
				}),
			],
			null,
		);

		expect(result.continuePost?.id).toBe(2);
	});

	it("returns null when no draft exists", () => {
		const result = buildDashboardData(
			[
				createPost({
					status: "published",
				}),
			],
			null,
		);

		expect(result.continuePost).toBeNull();
	});

	it("returns at most four recent posts in descending order", () => {
		const rows = Array.from({ length: 6 }, (_, index) =>
			createPost({
				id: index + 1,
				updatedAt: new Date(
					`2026-07-${String(index + 10).padStart(2, "0")}T10:00:00.000Z`,
				),
			}),
		);

		const result = buildDashboardData(rows, null);

		expect(result.recentPosts).toHaveLength(4);
		expect(result.recentPosts.map((post) => post.id)).toEqual([6, 5, 4, 3]);
	});

	it("serializes post dates as ISO strings", () => {
		const result = buildDashboardData(
			[
				createPost({
					updatedAt: new Date("2026-07-22T12:30:00.000Z"),
				}),
			],
			null,
		);

		expect(result.recentPosts[0]?.updatedAt).toBe("2026-07-22T12:30:00.000Z");
	});

	it("prevents negative word counts from reaching the UI", () => {
		const result = buildDashboardData(
			[
				createPost({
					wordCount: -100,
				}),
			],
			null,
		);

		expect(result.stats.totalWords).toBe(0);
		expect(result.recentPosts[0]?.wordCount).toBe(0);
	});
	it("keeps archived posts out of draft counts and continuePost", () => {
		const result = buildDashboardData(
			[
				createPost({ id: 1, status: "archived" }),
				createPost({ id: 2, status: "draft" }),
			],
			null,
		);

		expect(result.stats.totalPosts).toBe(2);
		expect(result.stats.draftPosts).toBe(1);
		expect(result.continuePost?.id).toBe(2);
		expect(result.recentPosts.map((post) => post.status)).toContain("archived");
	});
});

describe("post status integrity", () => {
	it("fails when stored status violates the lifecycle contract", () => {
		expect(() =>
			buildDashboardData([createPost({ status: "deleted" })], null),
		).toThrow("Received invalid post status: deleted");
	});
});

describe("normalizeAccentColor", () => {
	it("accepts a six-digit hexadecimal colour", () => {
		expect(normalizeAccentColor("#2563eb")).toBe("#2563eb");
	});

	it("rejects values unsafe for inline styling", () => {
		expect(normalizeAccentColor("red")).toBe(DEFAULT_ACCENT_COLOR);
		expect(normalizeAccentColor("url(javascript:alert(1))")).toBe(
			DEFAULT_ACCENT_COLOR,
		);
	});
});

function createActivityCell(
	date: string,
	wordsAdded: number,
	isFuture = false,
): ActivityCell {
	return {
		date,
		isFuture,
		level: 0,
		wordsAdded,
	};
}

function createActivity(days: number[]): WritingActivityHeatmap {
	const cells = days.map((wordsAdded, index) =>
		createActivityCell(
			new Date(Date.UTC(2026, 8, 7 + index)).toISOString().slice(0, 10),
			wordsAdded,
		),
	);

	return {
		activeDays: cells.filter((cell) => cell.wordsAdded > 0).length,
		cells,
		endDate: cells.at(-1)?.date ?? "2026-09-07",
		startDate: cells[0]?.date ?? "2026-09-07",
		timeZone: "UTC",
		today: cells.at(-1)?.date ?? "2026-09-07",
		totalWordsAdded: days.reduce((sum, value) => sum + value, 0),
	};
}

describe("getGreeting", () => {
	it("maps the hour of day to a greeting", () => {
		expect(getGreeting(new Date(2026, 8, 20, 8))).toBe("Good morning");
		expect(getGreeting(new Date(2026, 8, 20, 14))).toBe("Good afternoon");
		expect(getGreeting(new Date(2026, 8, 20, 20))).toBe("Good evening");
	});
});

describe("summarizeActivity", () => {
	it("summarizes the last seven days, average, best day, and streak", () => {
		const result = summarizeActivity(
			createActivity([100, 0, 250, 300, 0, 120, 80, 40, 60, 500]),
		);

		expect(result.thisWeek).toBe(1100);
		expect(result.bestDay).toBe(500);
		expect(result.bestWeek).toBe(1100);
		expect(result.currentStreak).toBe(5);
		expect(result.dailyAverage).toBe(181);
	});

	it("returns zeroed metrics when no words were written", () => {
		const result = summarizeActivity(createActivity([0, 0, 0, 0]));

		expect(result).toEqual({
			bestDay: 0,
			bestWeek: 0,
			currentStreak: 0,
			dailyAverage: 0,
			thisWeek: 0,
		});
	});
});
