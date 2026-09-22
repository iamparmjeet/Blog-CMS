// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AnalyticsDisplay } from "../analytics.config";
import { AnalyticsPage } from "./analytics-page";

vi.mock("@tanstack/react-router", () => ({
	Link: ({
		children,
		to,
		...rest
	}: {
		children: React.ReactNode;
		to: string;
	} & Record<string, unknown>) => (
		<a href={to} {...rest}>
			{children}
		</a>
	),
}));

afterEach(() => {
	cleanup();
});

const UNCONFIGURED: AnalyticsDisplay = { status: "unconfigured" };

const EMBED: AnalyticsDisplay = {
	status: "configured",
	mode: "embed",
	source: "share-url",
	url: "https://umami.example.com/share/abc",
};

const LINK_ENV: AnalyticsDisplay = {
	status: "configured",
	mode: "link",
	source: "env",
	url: "https://umami.example.com/",
};

describe("AnalyticsPage", () => {
	it("shows a setup empty state when Umami is not configured", () => {
		render(<AnalyticsPage config={UNCONFIGURED} />);

		expect(screen.getByText("Umami is not connected")).toBeTruthy();
		expect(
			screen.getByText(/Settings → Publishing → Umami analytics/i),
		).toBeTruthy();
		expect(screen.getByRole("link", { name: "Open Settings" })).toBeTruthy();
		expect(screen.queryByTitle("Umami analytics dashboard")).toBeNull();
	});

	it("embeds an https share URL in an owner-page iframe", () => {
		render(<AnalyticsPage config={EMBED} />);

		const iframe = screen.getByTitle("Umami analytics dashboard");
		expect(iframe.getAttribute("src")).toBe(
			"https://umami.example.com/share/abc",
		);
		expect(
			screen.getByRole("link", { name: /Open Umami dashboard/i }),
		).toBeTruthy();
	});

	it("falls back to an external link for non-embeddable configs", () => {
		render(<AnalyticsPage config={LINK_ENV} />);

		expect(screen.queryByTitle("Umami analytics dashboard")).toBeNull();
		const link = screen.getByRole("link", { name: /Open Umami dashboard/i });
		expect(link.getAttribute("href")).toBe("https://umami.example.com/");
		expect(link.getAttribute("target")).toBe("_blank");
		expect(link.getAttribute("rel")).toBe("noopener noreferrer");
	});

	it("never renders demo traffic numbers", () => {
		render(<AnalyticsPage config={UNCONFIGURED} />);
		expect(screen.queryByText("Blog views")).toBeNull();
		expect(screen.queryByText("Top blog pages")).toBeNull();
		expect(screen.queryByText("Umami not connected")).toBeNull();
	});
});
