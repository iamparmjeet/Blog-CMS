import { describe, expect, it } from "vitest";
import {
	addDays,
	getHeatmapStartDate,
} from "#/features/dashboard/writing-activity/writing.utils";
import {
	buildDemoActivityRows,
	buildDemoAnalytics,
	buildDemoDashboard,
	buildDemoPosts,
	countWordsInHtml,
	DEMO_TIME_ZONE,
} from "./demo-data";

const NOW = new Date("2026-09-23T12:00:00.000Z");
const TODAY = "2026-09-23";

describe("buildDemoPosts", () => {
	it("returns sample posts with unique ids and slugs", () => {
		const posts = buildDemoPosts(NOW);

		expect(posts.length).toBeGreaterThanOrEqual(5);
		expect(new Set(posts.map((post) => post.id)).size).toBe(posts.length);
		expect(new Set(posts.map((post) => post.slug)).size).toBe(posts.length);
	});

	it("covers draft, published, and scheduled statuses", () => {
		const statuses = new Set(buildDemoPosts(NOW).map((post) => post.status));

		expect(statuses.has("draft")).toBe(true);
		expect(statuses.has("published")).toBe(true);
		expect(statuses.has("scheduled")).toBe(true);
	});

	it("orders posts newest first and keeps dates in the past", () => {
		const posts = buildDemoPosts(NOW);

		for (let index = 1; index < posts.length; index += 1) {
			const previous = new Date(posts[index - 1]?.updatedAt ?? 0).getTime();
			const current = new Date(posts[index]?.updatedAt ?? 0).getTime();

			expect(previous).toBeGreaterThanOrEqual(current);
		}

		expect(
			posts.every((post) => new Date(post.updatedAt).getTime() < NOW.getTime()),
		).toBe(true);
	});

	it("gives every post a non-empty body and word count", () => {
		for (const post of buildDemoPosts(NOW)) {
			expect(post.body.trim().length).toBeGreaterThan(0);
			expect(post.wordCount).toBeGreaterThan(0);
		}
	});
});

describe("countWordsInHtml", () => {
	it("counts text words across markup", () => {
		expect(countWordsInHtml("<p>Hello <strong>world</strong></p>")).toBe(2);
	});

	it("ignores tags, entities, and extra whitespace", () => {
		expect(
			countWordsInHtml("<p>  </p><blockquote>&ldquo;One&rdquo;</blockquote>"),
		).toBe(1);
	});

	it("returns zero for empty content", () => {
		expect(countWordsInHtml("")).toBe(0);
		expect(countWordsInHtml("<p></p>")).toBe(0);
	});
});

describe("buildDemoActivityRows", () => {
	it("keeps every row inside the heatmap window", () => {
		const start = getHeatmapStartDate(TODAY);

		for (const row of buildDemoActivityRows(TODAY)) {
			expect(row.activityDate >= start).toBe(true);
			expect(row.activityDate <= TODAY).toBe(true);
			expect(row.wordsAdded).toBeGreaterThan(0);
		}
	});

	it("leaves rest days empty", () => {
		const rows = buildDemoActivityRows(TODAY);
		const start = getHeatmapStartDate(TODAY);
		const end = new Date(`${TODAY}T00:00:00.000Z`);
		const startDate = new Date(`${start}T00:00:00.000Z`);
		const days = Math.round(
			(end.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000),
		);

		expect(rows.length).toBeGreaterThan(days / 2);
		expect(rows.length).toBeLessThan(days);
	});

	it("is deterministic for a fixed day", () => {
		expect(buildDemoActivityRows(TODAY)).toEqual(buildDemoActivityRows(TODAY));
		expect(buildDemoActivityRows(addDays(TODAY, -1))).not.toEqual(
			buildDemoActivityRows(TODAY),
		);
	});
});

describe("buildDemoAnalytics", () => {
	it("is deterministic", () => {
		expect(buildDemoAnalytics()).toEqual(buildDemoAnalytics());
	});

	it("covers fourteen days of positive traffic with unique days", () => {
		const data = buildDemoAnalytics();

		expect(data.last14Days).toHaveLength(14);
		expect(data.last14Days.every((entry) => entry.views > 0)).toBe(true);
		expect(new Set(data.last14Days.map((entry) => entry.day)).size).toBe(14);
	});

	it("keeps pageviews above visitors and top pages ranked", () => {
		const data = buildDemoAnalytics();

		expect(data.pageviews).toBeGreaterThan(data.visitors);
		expect(data.visitors).toBeGreaterThan(0);
		expect(new Set(data.topPages.map((page) => page.path)).size).toBe(
			data.topPages.length,
		);

		for (let index = 1; index < data.topPages.length; index += 1) {
			expect(data.topPages[index - 1]?.views).toBeGreaterThanOrEqual(
				data.topPages[index]?.views ?? 0,
			);
		}
	});
});

describe("buildDemoDashboard", () => {
	it("derives stats from the sample posts", () => {
		const posts = buildDemoPosts(NOW);
		const data = buildDemoDashboard(posts, TODAY);

		expect(data.stats.totalPosts).toBe(posts.length);
		expect(data.stats.totalWords).toBe(
			posts.reduce((total, post) => total + post.wordCount, 0),
		);
		expect(data.stats.publishedPosts).toBe(
			posts.filter((post) => post.status === "published").length,
		);
		expect(data.stats.draftPosts).toBe(
			posts.filter((post) => post.status === "draft").length,
		);
	});

	it("continues the most recently updated draft", () => {
		const posts = buildDemoPosts(NOW);
		const data = buildDemoDashboard(posts, TODAY);
		const expected = posts.find((post) => post.status === "draft");

		expect(data.continuePost?.id).toBe(expected?.id);
	});

	it("caps recent posts at four", () => {
		const data = buildDemoDashboard(buildDemoPosts(NOW), TODAY);

		expect(data.recentPosts.length).toBeLessThanOrEqual(4);
	});

	it("builds a heatmap whose totals match its rows", () => {
		const data = buildDemoDashboard(buildDemoPosts(NOW), TODAY);
		const rows = buildDemoActivityRows(TODAY);

		expect(data.activity.timeZone).toBe(DEMO_TIME_ZONE);
		expect(data.activity.totalWordsAdded).toBe(
			rows.reduce((total, row) => total + row.wordsAdded, 0),
		);
	});
});
