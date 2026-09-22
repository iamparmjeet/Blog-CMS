import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	APPEARANCE_BOOTSTRAP_SCRIPT,
	APPEARANCE_STORAGE_KEY,
	cacheAppearance,
	normalizeAppearance,
	readCachedAppearance,
} from "./appearance";
import { DEFAULT_APPEARANCE } from "./settings.types";

describe("normalizeAppearance", () => {
	it("returns defaults for null input", () => {
		expect(normalizeAppearance(null)).toEqual(DEFAULT_APPEARANCE);
		expect(normalizeAppearance(undefined)).toEqual(DEFAULT_APPEARANCE);
	});

	it("keeps valid values", () => {
		expect(
			normalizeAppearance({
				accentColor: "#2563eb",
				surfaceTint: "#059669",
				themeMode: "day",
			}),
		).toEqual({
			accentColor: "#2563eb",
			surfaceTint: "#059669",
			themeMode: "day",
		});
	});

	it("rejects invalid theme and hex values", () => {
		expect(
			normalizeAppearance({
				accentColor: "red",
				surfaceTint: "#fff",
				themeMode: "midnight" as never,
			}),
		).toEqual(DEFAULT_APPEARANCE);
	});

	it("allows empty surface tint", () => {
		expect(normalizeAppearance({ surfaceTint: "" }).surfaceTint).toBe("");
	});
});

describe("appearance cache", () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	it("round-trips through localStorage", () => {
		const next = {
			accentColor: "#0891b2",
			surfaceTint: "",
			themeMode: "day" as const,
		};

		cacheAppearance(next);
		expect(readCachedAppearance()).toEqual(next);
	});

	it("falls back to defaults when storage is empty or corrupt", () => {
		expect(readCachedAppearance()).toEqual(DEFAULT_APPEARANCE);

		window.localStorage.setItem(APPEARANCE_STORAGE_KEY, "{not json");
		expect(readCachedAppearance()).toEqual(DEFAULT_APPEARANCE);
	});
});

describe("bootstrap script", () => {
	it("embeds the storage key", () => {
		expect(APPEARANCE_BOOTSTRAP_SCRIPT).toContain(APPEARANCE_STORAGE_KEY);
		expect(APPEARANCE_BOOTSTRAP_SCRIPT).toContain("prefers-color-scheme");
	});

	it("does not reference user-controlled input", () => {
		const spy = vi.spyOn(console, "error");
		expect(() => new Function(APPEARANCE_BOOTSTRAP_SCRIPT)()).not.toThrow();
		expect(spy).not.toHaveBeenCalled();
		spy.mockRestore();
	});
});
