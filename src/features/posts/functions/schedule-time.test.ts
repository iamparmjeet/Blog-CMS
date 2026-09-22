import { describe, expect, it } from "vitest";
import { utcToDateTimeLocalInput, zonedDateTimeToUtc } from "./schedule-time";

describe("zonedDateTimeToUtc", () => {
	it("converts a Kolkata wall time to UTC", () => {
		expect(
			zonedDateTimeToUtc("2026-09-23T10:00", "Asia/Kolkata").toISOString(),
		).toBe("2026-09-23T04:30:00.000Z");
	});

	it("respects daylight saving in New York", () => {
		expect(
			zonedDateTimeToUtc("2026-09-23T10:00", "America/New_York").toISOString(),
		).toBe("2026-09-23T14:00:00.000Z");
		expect(
			zonedDateTimeToUtc("2026-01-15T10:00", "America/New_York").toISOString(),
		).toBe("2026-01-15T15:00:00.000Z");
	});

	it("treats UTC as the identity zone", () => {
		expect(zonedDateTimeToUtc("2026-09-23T10:00", "UTC").toISOString()).toBe(
			"2026-09-23T10:00:00.000Z",
		);
	});

	it("rejects malformed datetime-local input", () => {
		expect(() => zonedDateTimeToUtc("tomorrow", "UTC")).toThrow();
		expect(() => zonedDateTimeToUtc("2026-13-40T99:99", "UTC")).toThrow();
	});

	it("rejects an unknown time zone", () => {
		expect(() =>
			zonedDateTimeToUtc("2026-09-23T10:00", "Mars/Olympus"),
		).toThrow();
	});
});

describe("utcToDateTimeLocalInput", () => {
	it("renders a UTC instant as Kolkata wall time", () => {
		expect(
			utcToDateTimeLocalInput(
				new Date("2026-09-23T04:30:00.000Z"),
				"Asia/Kolkata",
			),
		).toBe("2026-09-23T10:00");
	});

	it("round-trips through the forward conversion", () => {
		const instant = new Date("2026-09-23T04:30:00.000Z");

		expect(
			zonedDateTimeToUtc(
				utcToDateTimeLocalInput(instant, "America/New_York"),
				"America/New_York",
			).toISOString(),
		).toBe(instant.toISOString());
	});
});
