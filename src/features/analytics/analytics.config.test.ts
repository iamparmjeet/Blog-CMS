import { describe, expect, it } from "vitest";
import { resolveAnalyticsDisplay } from "./analytics.config";

describe("resolveAnalyticsDisplay", () => {
	it("is unconfigured when nothing is set", () => {
		expect(resolveAnalyticsDisplay({})).toEqual({ status: "unconfigured" });
		expect(
			resolveAnalyticsDisplay({ umamiShareUrl: "", envUmamiUrl: null }),
		).toEqual({ status: "unconfigured" });
		expect(
			resolveAnalyticsDisplay({ umamiShareUrl: "   ", envUmamiUrl: "" }),
		).toEqual({ status: "unconfigured" });
	});

	it("embeds an https share URL", () => {
		expect(
			resolveAnalyticsDisplay({
				umamiShareUrl: "https://umami.example.com/share/abc123",
			}),
		).toEqual({
			status: "configured",
			mode: "embed",
			source: "share-url",
			url: "https://umami.example.com/share/abc123",
		});
	});

	it("links (not embeds) an http share URL", () => {
		expect(
			resolveAnalyticsDisplay({
				umamiShareUrl: "http://umami.example.com/share/abc123",
			}),
		).toEqual({
			status: "configured",
			mode: "link",
			source: "share-url",
			url: "http://umami.example.com/share/abc123",
		});
	});

	it("ignores invalid share URLs and falls back to env", () => {
		expect(
			resolveAnalyticsDisplay({
				umamiShareUrl: "javascript:alert(1)",
				envUmamiUrl: "https://umami.example.com",
			}),
		).toEqual({
			status: "configured",
			mode: "link",
			source: "env",
			url: "https://umami.example.com/",
		});

		expect(resolveAnalyticsDisplay({ umamiShareUrl: "not a url" })).toEqual({
			status: "unconfigured",
		});
	});

	it("prefers the share URL over env", () => {
		expect(
			resolveAnalyticsDisplay({
				umamiShareUrl: "https://umami.example.com/share/abc",
				envUmamiUrl: "https://env-umami.example.com",
			}),
		).toMatchObject({
			source: "share-url",
			url: "https://umami.example.com/share/abc",
		});
	});

	it("uses env UMAMI_URL as an external link when no share URL is saved", () => {
		expect(
			resolveAnalyticsDisplay({
				umamiShareUrl: "",
				envUmamiUrl: "https://umami.example.com",
			}),
		).toEqual({
			status: "configured",
			mode: "link",
			source: "env",
			url: "https://umami.example.com/",
		});
	});

	it("trims surrounding whitespace on the share URL", () => {
		expect(
			resolveAnalyticsDisplay({
				umamiShareUrl: "  https://umami.example.com/share/abc\n",
			}),
		).toMatchObject({ url: "https://umami.example.com/share/abc" });
	});
});
