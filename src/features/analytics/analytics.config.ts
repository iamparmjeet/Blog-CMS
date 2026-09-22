export type AnalyticsDisplaySource = "share-url" | "env";

export type AnalyticsDisplay =
	| { status: "unconfigured" }
	| {
			status: "configured";
			mode: "embed" | "link";
			source: AnalyticsDisplaySource;
			url: string;
	  };

function parseHttpUrl(raw: string | null | undefined): URL | null {
	const trimmed = (raw ?? "").trim();
	if (trimmed === "") {
		return null;
	}

	try {
		const url = new URL(trimmed);
		if (url.protocol !== "https:" && url.protocol !== "http:") {
			return null;
		}
		return url;
	} catch {
		return null;
	}
}

/**
 * Resolve how the owner-only analytics page should present Umami.
 *
 * Priority: the owner's saved share URL (embeddable when https), then a
 * server-side UMAMI_URL fallback (external link only), then unconfigured.
 * Never receives or returns API credentials.
 */
export function resolveAnalyticsDisplay(input: {
	umamiShareUrl?: string | null;
	envUmamiUrl?: string | null;
}): AnalyticsDisplay {
	const shareUrl = parseHttpUrl(input.umamiShareUrl);
	if (shareUrl) {
		return {
			status: "configured",
			mode: shareUrl.protocol === "https:" ? "embed" : "link",
			source: "share-url",
			url: shareUrl.href,
		};
	}

	const envUrl = parseHttpUrl(input.envUmamiUrl);
	if (envUrl) {
		return {
			status: "configured",
			mode: "link",
			source: "env",
			url: envUrl.href,
		};
	}

	return { status: "unconfigured" };
}
