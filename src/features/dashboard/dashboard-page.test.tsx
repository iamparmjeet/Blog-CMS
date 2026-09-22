// @vitest-environment jsdom

import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	RouterContextProvider,
} from "@tanstack/react-router";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { AuthenticatedUser } from "#/lib/auth/auth.types";
import { DashBoardPage } from "./dashboard-page";
import type { DashboardData } from "./functions/dashboard.types";
import type { WritingActivityHeatmap } from "./writing-activity/writing.types";

afterEach(() => {
	cleanup();
});

const user: AuthenticatedUser = {
	email: "owner@example.com",
	emailVerified: true,
	id: "owner-1",
	image: null,
	name: "Ada Lovelace",
};

function createActivity(
	overrides: Partial<WritingActivityHeatmap> = {},
): WritingActivityHeatmap {
	const start = new Date("2026-07-05T00:00:00.000Z");
	const cells = Array.from({ length: 84 }, (_, index) => {
		const date = new Date(start);
		date.setUTCDate(start.getUTCDate() + index);
		const dateStr = date.toISOString().slice(0, 10);
		return {
			date: dateStr,
			isFuture: index >= 80,
			level: 0 as const,
			wordsAdded: index >= 80 ? 0 : 10,
		};
	});

	return {
		activeDays: 80,
		cells,
		endDate: "2026-09-26",
		startDate: "2026-07-05",
		timeZone: "Asia/Kolkata",
		totalWordsAdded: 800,
		today: "2026-09-22",
		...overrides,
	};
}

function createData(overrides: Partial<DashboardData> = {}): DashboardData {
	return {
		accentColor: "#7c3aed",
		activity: createActivity(),
		continuePost: null,
		recentPosts: [],
		stats: {
			draftPosts: 0,
			publishedPosts: 0,
			totalPosts: 0,
			totalWords: 0,
		},
		...overrides,
	};
}

function renderDashboard(data: DashboardData) {
	const rootRoute = createRootRoute();
	const indexRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "/",
	});
	const dashboardRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "/dashboard",
	});
	const postsRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "/posts",
		validateSearch: (search: Record<string, unknown>): { tab?: string } =>
			search as { tab?: string },
	});
	const postDetailRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "/posts/$postId",
	});

	const router = createRouter({
		history: createMemoryHistory({ initialEntries: ["/dashboard"] }),
		routeTree: rootRoute.addChildren([
			indexRoute,
			dashboardRoute,
			postsRoute,
			postDetailRoute,
		]),
	});

	render(
		<RouterContextProvider router={router}>
			<DashBoardPage data={data} user={user} />
		</RouterContextProvider>,
	);

	return router;
}

describe("DashBoardPage", () => {
	it("renders the empty dashboard state", () => {
		renderDashboard(createData());

		expect(
			screen.getByRole("heading", {
				name: /Good (morning|afternoon|evening), Ada/,
			}),
		).toBeTruthy();
		expect(screen.getByText("No draft to continue.")).toBeTruthy();
		expect(
			screen.getByText("Your most recently updated posts will appear here."),
		).toBeTruthy();
		expect(screen.getByText("Posts total")).toBeTruthy();
		expect(screen.getAllByText("0").length).toBeGreaterThanOrEqual(1);
	});

	it("links stat cards and posts to functional post workflows", async () => {
		const data = createData({
			continuePost: {
				id: 7,
				status: "draft",
				title: "Half-written essay",
				updatedAt: "2026-09-20T10:00:00.000Z",
				wordCount: 420,
			},
			recentPosts: [
				{
					id: 7,
					status: "draft",
					title: "Half-written essay",
					updatedAt: "2026-09-20T10:00:00.000Z",
					wordCount: 420,
				},
				{
					id: 8,
					status: "published",
					title: "Shipped notes",
					updatedAt: "2026-09-19T10:00:00.000Z",
					wordCount: 800,
				},
			],
			stats: {
				draftPosts: 1,
				publishedPosts: 1,
				totalPosts: 2,
				totalWords: 1220,
			},
		});

		renderDashboard(data);

		const totalWordsLink = screen
			.getByText("Posts total")
			.closest("a") as HTMLAnchorElement | null;
		expect(totalWordsLink?.getAttribute("href")).toContain("/posts");
		expect(totalWordsLink?.getAttribute("href")).toContain("tab=all");

		const publishedLink = screen
			.getAllByText("Published")[0]
			.closest("a") as HTMLAnchorElement | null;
		expect(publishedLink?.getAttribute("href")).toContain("tab=published");

		const draftsLink = screen
			.getAllByText("Drafts")[0]
			.closest("a") as HTMLAnchorElement | null;
		expect(draftsLink?.getAttribute("href")).toContain("tab=drafts");

		const continueLink = screen.getByRole("link", {
			name: "Half-written essay",
		});
		expect(continueLink.getAttribute("href")).toBe("/posts/7");

		const viewAll = screen.getByRole("link", { name: /View all posts/i });
		expect(viewAll.getAttribute("href")).toBe("/posts");

		const recentSection = screen.getByRole("region", {
			name: "Recent posts",
		});
		const recentLinks = within(recentSection).getAllByRole("link");
		const postLinks = recentLinks.filter((link) =>
			link.getAttribute("href")?.startsWith("/posts/"),
		);
		expect(postLinks.map((link) => link.getAttribute("href"))).toEqual([
			"/posts/7",
			"/posts/8",
		]);
	});

	it("shows the owner time zone greeting for a non-UTC day boundary", () => {
		// Freeze now near UTC midnight so Asia/Kolkata is already the next calendar day.
		const fixedNow = new Date("2026-09-20T19:30:00.000Z");
		const RealDate = Date;

		class MockDate extends RealDate {
			constructor(...args: unknown[]) {
				if (args.length === 0) {
					super(fixedNow);
					return;
				}
				super(...(args as ConstructorParameters<typeof Date>));
			}

			static override now() {
				return fixedNow.getTime();
			}
		}

		globalThis.Date = MockDate as unknown as DateConstructor;

		try {
			renderDashboard(createData());

			const heading = screen.getByRole("heading", { level: 1 });
			// 19:30Z = 01:00 IST next day → still morning.
			expect(heading.textContent).toContain("Good morning, Ada");
			// en-US long date for 2026-09-21 in Asia/Kolkata (sibling of the heading; year omitted by formatter).
			expect(screen.getByText("Monday, September 21")).toBeTruthy();
		} finally {
			globalThis.Date = RealDate;
		}
	});
});
