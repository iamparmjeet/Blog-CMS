import type { JSONContent } from "@tiptap/core";
import { parseStoredPostBody } from "#/features/posts/functions/post-body";
import type { FeedPost, FeedPublishedPostRow } from "./feed.types";

export const FEED_CACHE_CONTROL = "public, max-age=60";

export function parseAllowedOrigins(raw: string | null | undefined): string[] {
	if (!raw) {
		return [];
	}

	const origins = raw
		.split(/[\n,;]+/u)
		.map((entry) => normalizeOrigin(entry))
		.filter((entry): entry is string => entry !== null);

	return [...new Set(origins)];
}

export function normalizeOrigin(value: string): string | null {
	const trimmed = value.trim();

	if (!trimmed) {
		return null;
	}

	try {
		const url = new URL(
			trimmed.includes("://") ? trimmed : `https://${trimmed}`,
		);

		if (url.protocol !== "http:" && url.protocol !== "https:") {
			return null;
		}

		return url.origin;
	} catch {
		return null;
	}
}

export function isOriginAllowed(
	origin: string | null | undefined,
	allowedOrigins: readonly string[],
): boolean {
	if (!origin) {
		return false;
	}

	const normalized = normalizeOrigin(origin);

	return normalized !== null && allowedOrigins.includes(normalized);
}

export interface FeedCorsDecision {
	allowed: boolean;
	headers: Record<string, string>;
}

/**
 * Evaluate a feed request against the owner's allowlist.
 *
 * - No Origin header: non-browser client (curl, server-side fetch) — allowed,
 *   no CORS headers needed.
 * - Origin present: must exactly match an allowlisted origin, otherwise the
 *   request receives no publishable content and no CORS grant.
 */
export function evaluateFeedCors(
	request: Request,
	allowedOrigins: readonly string[],
): FeedCorsDecision {
	const origin = request.headers.get("Origin");
	const isPreflight = request.method === "OPTIONS";

	if (origin === null) {
		return {
			allowed: true,
			headers: {
				"Cache-Control": FEED_CACHE_CONTROL,
				Vary: "Origin",
			},
		};
	}

	if (!isOriginAllowed(origin, allowedOrigins)) {
		return { allowed: false, headers: { Vary: "Origin" } };
	}

	const headers: Record<string, string> = {
		"Access-Control-Allow-Origin": origin,
		Vary: "Origin",
	};

	if (isPreflight) {
		headers["Access-Control-Allow-Methods"] = "GET, OPTIONS";
		headers["Access-Control-Allow-Headers"] = "Content-Type";
		headers["Access-Control-Max-Age"] = "86400";
	} else {
		headers["Cache-Control"] = FEED_CACHE_CONTROL;
	}

	return { allowed: true, headers };
}

export function jsonFeedResponse(
	data: unknown,
	status: number,
	headers: Record<string, string>,
): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			...headers,
		},
	});
}

export function buildFeedPostUrl({
	domain,
	requestUrl,
	slug,
}: {
	domain: string | null | undefined;
	requestUrl: string;
	slug: string;
}): string {
	if (domain?.trim()) {
		const base = /^https?:\/\//iu.test(domain)
			? domain
			: `https://${domain.trim()}`;

		try {
			return new URL(`/posts/${slug}`, base).toString();
		} catch {
			// fall through to the request-derived URL
		}
	}

	return new URL(`/posts/${slug}`, requestUrl).toString();
}

export function toFeedPost(
	row: FeedPublishedPostRow,
	{
		domain,
		requestUrl,
	}: { domain: string | null | undefined; requestUrl: string },
): FeedPost {
	return {
		slug: row.slug,
		title: row.title,
		description: row.description,
		seoTitle: row.seoTitle,
		publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
		updatedAt: row.updatedAt.toISOString(),
		// Defensive: lifecycle rules prevent negative counts, but the feed
		// must never expose one.
		wordCount: Math.max(0, row.wordCount),
		url: buildFeedPostUrl({ domain, requestUrl, slug: row.slug }),
		body: sanitizeFeedBody(parseStoredPostBody(row.body)),
	};
}

/**
 * Strip anything that is not a safe http(s) asset URL from the canonical
 * TipTap body before it leaves the instance. Media nodes with unsafe or
 * missing sources are dropped entirely; link marks with unsafe hrefs are
 * removed while keeping their text.
 */
export function sanitizeFeedBody(body: JSONContent): JSONContent {
	const sanitized = sanitizeNode(body);

	// The root doc must survive even if every child was dropped.
	return sanitized ?? { type: "doc", content: [] };
}

const MEDIA_NODE_TYPES = new Set(["image", "mediaAsset", "video"]);

function sanitizeNode(node: JSONContent): JSONContent | null {
	const type = node.type ?? "";

	if (MEDIA_NODE_TYPES.has(type)) {
		const src = typeof node.attrs?.src === "string" ? node.attrs.src : "";

		if (!isSafeAssetUrl(src)) {
			return null;
		}

		return {
			...node,
			attrs: { ...node.attrs, src },
		};
	}

	const attrs = sanitizeAttrs(node.attrs);
	const marks = node.marks
		?.map((mark) => {
			const markAttrs = sanitizeMarkAttrs(mark.attrs);

			return markAttrs === null ? null : { ...mark, attrs: markAttrs };
		})
		.filter((mark): mark is NonNullable<typeof mark> => mark !== null);

	const content = node.content
		?.map(sanitizeNode)
		.filter((child): child is JSONContent => child !== null);

	const next: JSONContent = { ...node };

	if (attrs !== null) {
		next.attrs = attrs;
	}

	if (marks) {
		next.marks = marks;
	}

	if (node.content) {
		next.content = content ?? [];
	}

	return next;
}

function sanitizeAttrs(
	attrs: Record<string, unknown> | undefined,
): Record<string, unknown> | null {
	if (!attrs) {
		return null;
	}

	const next = { ...attrs };
	const src = next.src;

	if (typeof src === "string" && !isSafeAssetUrl(src)) {
		delete next.src;
	}

	const href = next.href;

	if (
		typeof href === "string" &&
		!isSafeAssetUrl(href) &&
		!isSafeLinkUrl(href)
	) {
		delete next.href;
	}

	return next;
}

function sanitizeMarkAttrs(
	attrs: Record<string, unknown> | undefined,
): Record<string, unknown> | null {
	if (!attrs) {
		return null;
	}

	const next = { ...attrs };
	const href = next.href;

	if (
		typeof href === "string" &&
		!isSafeLinkUrl(href) &&
		!isSafeAssetUrl(href)
	) {
		delete next.href;
	}

	return next;
}

export function isSafeAssetUrl(value: string): boolean {
	try {
		const url = new URL(value);
		return url.protocol === "http:" || url.protocol === "https:";
	} catch {
		return false;
	}
}

export function isSafeLinkUrl(value: string): boolean {
	if (value.startsWith("/") && !value.startsWith("//")) {
		return true;
	}

	return isSafeAssetUrl(value);
}
