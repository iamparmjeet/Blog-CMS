import { describe, expect, it } from "vitest";
import { createSseParser, mapProviderError, parseSseStream } from "./ai-stream";

describe("createSseParser", () => {
	it("concatenates content deltas across chunks", () => {
		const parser = createSseParser();

		parser.feed(
			'data: {"choices":[{"delta":{"content":"Hel"}}]}\n\ndata: {"choices":[{"delta":{"content":"lo"}}]}\n\n',
		);

		expect(parser.deltas).toEqual(["Hel", "lo"]);
		expect(parser.text).toBe("Hello");
		expect(parser.done).toBe(false);
	});

	it("tolerates chunks split mid-line", () => {
		const parser = createSseParser();

		parser.feed('data: {"choices":[{"delta":{"cont');
		parser.feed('ent":"Hi"}}]}\n\n');

		expect(parser.text).toBe("Hi");
	});

	it("marks the stream done on [DONE] and ignores trailing noise", () => {
		const parser = createSseParser();

		parser.feed(
			'data: {"choices":[{"delta":{"content":"Hi"}}]}\n\ndata: [DONE]\n\n',
		);

		expect(parser.done).toBe(true);
		expect(parser.text).toBe("Hi");

		parser.feed('data: {"choices":[{"delta":{"content":" ignored"}}]}\n\n');

		expect(parser.text).toBe("Hi");
	});

	it("ignores heartbeat lines and role-only deltas", () => {
		const parser = createSseParser();

		parser.feed(
			': ping\n\ndata: {"choices":[{"delta":{"role":"assistant"}}]}\n\ndata: {"choices":[{"finish_reason":"stop","delta":{}}]}\n\n',
		);

		expect(parser.deltas).toEqual([]);
		expect(parser.done).toBe(false);
	});

	it("surfaces a mid-stream provider error payload", () => {
		const parser = createSseParser();

		parser.feed('data: {"error":{"message":"upstream blew up"}}\n\n');

		expect(parser.error).toBe("upstream blew up");
	});
});

describe("parseSseStream", () => {
	it("parses a complete buffered stream", () => {
		const result = parseSseStream(
			'data: {"choices":[{"delta":{"content":"A"}}]}\n\ndata: {"choices":[{"delta":{"content":"B"}}]}\n\ndata: [DONE]\n\n',
		);

		expect(result).toEqual({ text: "AB", done: true, error: null });
	});
});

describe("mapProviderError", () => {
	it("maps 401 to an invalid-key error", () => {
		expect(mapProviderError(401, "")).toMatchObject({
			code: "invalid_key",
			status: 401,
		});
	});

	it("maps 429 to a rate-limited error", () => {
		expect(mapProviderError(429, "")).toMatchObject({
			code: "rate_limited",
			status: 429,
		});
	});

	it("maps 5xx to a provider-unavailable error", () => {
		expect(mapProviderError(503, "")).toMatchObject({
			code: "provider_unavailable",
			status: 503,
		});
	});

	it("maps other statuses to a generic provider error", () => {
		expect(mapProviderError(400, "bad request")).toMatchObject({
			code: "provider_error",
			status: 400,
		});
		expect(mapProviderError(400, "bad request").message).toContain(
			"bad request",
		);
	});
});
