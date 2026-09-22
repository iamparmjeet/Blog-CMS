import { eq, sql } from "drizzle-orm";
import type { Db } from "#/db";
import { rateLimits } from "#/db/schema";

export const RATE_LIMIT_WINDOW_MS = 60_000;

export interface RateLimitScope {
	scope: string;
	limit: number;
	windowMs: number;
}

/**
 * Per-surface fixed-window budgets. Anonymous feed surfaces key by client
 * IP; the owner-only AI routes key by user id. Budgets are abuse protection,
 * not billing: they fail open only when the store itself is unreachable,
 * never by skipping the check.
 */
export const RATE_LIMITS = {
	feedCollection: { scope: "feed-collection", limit: 100, windowMs: 60_000 },
	feedPost: { scope: "feed-post", limit: 100, windowMs: 60_000 },
	rss: { scope: "rss", limit: 60, windowMs: 60_000 },
	aiGenerate: { scope: "ai-generate", limit: 10, windowMs: 60_000 },
	aiRepurpose: { scope: "ai-repurpose", limit: 10, windowMs: 60_000 },
} as const satisfies Record<string, RateLimitScope>;

export interface RateLimitResult {
	allowed: boolean;
	count: number;
	limit: number;
	retryAfterMs: number;
}

/**
 * Atomically increments the fixed-window bucket for `key` and reports
 * whether the hit fits the budget. Windows anchor to the epoch so parallel
 * workers agree without coordination.
 */
export async function checkRateLimit(
	db: Db,
	{
		key,
		limit,
		windowMs,
		now = new Date(),
	}: {
		key: string;
		limit: number;
		windowMs: number;
		now?: Date;
	},
): Promise<RateLimitResult> {
	const windowStart = Math.floor(now.getTime() / windowMs) * windowMs;

	await db
		.insert(rateLimits)
		.values({ key, windowStart, count: 1 })
		.onConflictDoUpdate({
			target: rateLimits.key,
			set: {
				count: sql`CASE WHEN ${rateLimits.windowStart} = ${windowStart} THEN ${rateLimits.count} + 1 ELSE 1 END`,
				windowStart,
			},
		});

	const row = await db
		.select({ count: rateLimits.count })
		.from(rateLimits)
		.where(eq(rateLimits.key, key))
		.get();

	const count = row?.count ?? 1;
	const allowed = count <= limit;

	return {
		allowed,
		count,
		limit,
		retryAfterMs: allowed ? 0 : windowStart + windowMs - now.getTime(),
	};
}

export function identityFromRequest(request: Request): string {
	const connectingIp = request.headers.get("cf-connecting-ip")?.trim();

	if (connectingIp) {
		return connectingIp;
	}

	const forwarded = request.headers.get("x-forwarded-for");

	if (forwarded) {
		const first = forwarded.split(",")[0]?.trim();

		if (first) {
			return first;
		}
	}

	return "unknown";
}

export function rateLimitKey(scope: string, identity: string): string {
	return `${scope}:${identity}`;
}

/**
 * Returns a 429 JSON response when the budget is spent, else null. Shares
 * the feed error shape so every throttled surface answers consistently.
 */
export async function enforceRateLimit(
	db: Db,
	request: Request,
	{
		scope,
		limit,
		windowMs,
		identity,
		now,
	}: {
		scope: string;
		limit: number;
		windowMs: number;
		identity?: string;
		now?: Date;
	},
): Promise<Response | null> {
	const resolvedNow = now ?? new Date();
	const result = await checkRateLimit(db, {
		key: rateLimitKey(scope, identity ?? identityFromRequest(request)),
		limit,
		windowMs,
		now: resolvedNow,
	});

	if (result.allowed) {
		return null;
	}

	return new Response(
		JSON.stringify({
			error: {
				code: "rate_limited",
				message:
					"Too many requests. Slow down and retry after the indicated delay.",
			},
		}),
		{
			status: 429,
			headers: {
				"content-type": "application/json",
				"cache-control": "no-store",
				"retry-after": String(
					Math.max(1, Math.ceil(result.retryAfterMs / 1000)),
				),
			},
		},
	);
}
