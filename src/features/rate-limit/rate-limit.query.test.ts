import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "#/db";
import {
	checkRateLimit,
	enforceRateLimit,
	identityFromRequest,
} from "./rate-limit.query";

function createThrowawayDb(): Db {
	const sqlite = new Database(":memory:");

	sqlite.exec(`
		CREATE TABLE rate_limits (
			key TEXT PRIMARY KEY NOT NULL,
			window_start INTEGER NOT NULL,
			count INTEGER NOT NULL
		);
	`);

	return drizzle(sqlite) as unknown as Db;
}

const WINDOW_MS = 60_000;
const NOW = new Date("2026-09-22T00:00:00.000Z");

let db: Db;

beforeEach(() => {
	db = createThrowawayDb();
});

describe("checkRateLimit", () => {
	it("allows the first hit in a window", async () => {
		const result = await checkRateLimit(db, {
			key: "feed:1.2.3.4",
			limit: 2,
			windowMs: WINDOW_MS,
			now: NOW,
		});

		expect(result).toEqual({
			allowed: true,
			count: 1,
			limit: 2,
			retryAfterMs: 0,
		});
	});

	it("blocks past the limit and reports the window reset", async () => {
		const input = {
			key: "feed:1.2.3.4",
			limit: 2,
			windowMs: WINDOW_MS,
			now: NOW,
		};

		await checkRateLimit(db, input);
		await checkRateLimit(db, input);
		const blocked = await checkRateLimit(db, input);

		expect(blocked.allowed).toBe(false);
		expect(blocked.count).toBe(3);
		expect(blocked.retryAfterMs).toBe(WINDOW_MS);
	});

	it("resets when the window rolls over", async () => {
		const input = {
			key: "feed:1.2.3.4",
			limit: 1,
			windowMs: WINDOW_MS,
			now: NOW,
		};

		await checkRateLimit(db, input);
		expect((await checkRateLimit(db, input)).allowed).toBe(false);

		const next = await checkRateLimit(db, {
			...input,
			now: new Date(NOW.getTime() + WINDOW_MS),
		});

		expect(next).toEqual({
			allowed: true,
			count: 1,
			limit: 1,
			retryAfterMs: 0,
		});
	});

	it("tracks keys independently", async () => {
		await checkRateLimit(db, {
			key: "feed:1.2.3.4",
			limit: 1,
			windowMs: WINDOW_MS,
			now: NOW,
		});

		expect(
			(
				await checkRateLimit(db, {
					key: "feed:5.6.7.8",
					limit: 1,
					windowMs: WINDOW_MS,
					now: NOW,
				})
			).allowed,
		).toBe(true);
	});
});

describe("identityFromRequest", () => {
	it("prefers the Cloudflare connecting IP", () => {
		const request = new Request("https://cms.example/api/posts", {
			headers: {
				"cf-connecting-ip": "1.2.3.4",
				"x-forwarded-for": "5.6.7.8",
			},
		});

		expect(identityFromRequest(request)).toBe("1.2.3.4");
	});

	it("falls back to the first forwarded address", () => {
		const request = new Request("https://cms.example/api/posts", {
			headers: { "x-forwarded-for": "5.6.7.8, 9.9.9.9" },
		});

		expect(identityFromRequest(request)).toBe("5.6.7.8");
	});

	it("labels direct connections without headers", () => {
		expect(
			identityFromRequest(new Request("https://cms.example/api/posts")),
		).toBe("unknown");
	});
});

describe("enforceRateLimit", () => {
	it("returns null while under the limit", async () => {
		const request = new Request("https://cms.example/api/posts");

		expect(
			await enforceRateLimit(db, request, {
				scope: "feed",
				limit: 1,
				windowMs: WINDOW_MS,
				now: NOW,
			}),
		).toBeNull();
	});

	it("returns a 429 with retry guidance past the limit", async () => {
		const request = new Request("https://cms.example/api/posts", {
			headers: { "cf-connecting-ip": "1.2.3.4" },
		});
		const options = {
			scope: "feed",
			limit: 1,
			windowMs: WINDOW_MS,
			now: NOW,
		};

		await enforceRateLimit(db, request, options);
		const blocked = await enforceRateLimit(db, request, options);

		expect(blocked?.status).toBe(429);
		expect(blocked?.headers.get("retry-after")).toBe("60");

		const payload = (await blocked?.json()) as {
			error?: { code?: string };
		};
		expect(payload.error?.code).toBe("rate_limited");
	});
});
