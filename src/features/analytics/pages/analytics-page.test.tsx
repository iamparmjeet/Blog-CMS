// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AnalyticsPage } from "./analytics-page";

afterEach(() => {
	cleanup();
});

describe("AnalyticsPage", () => {
	it("uses the saved appearance accent for analytics content", () => {
		render(<AnalyticsPage />);

		expect(screen.getByText("Last 30 days").style.color).toBe("var(--brand)");
		expect(screen.getAllByTitle(/views$/).at(-1)?.style.background).toBe(
			"var(--brand)",
		);
		expect(
			screen
				.getByText("India")
				.parentElement?.nextElementSibling?.firstElementChild?.getAttribute(
					"style",
				),
		).toContain("var(--brand)");
	});
});
