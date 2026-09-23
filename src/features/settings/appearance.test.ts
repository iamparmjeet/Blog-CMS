import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	APPEARANCE_BOOTSTRAP_SCRIPT,
	APPEARANCE_STORAGE_KEY,
	brandForegroundFor,
	cacheAppearance,
	normalizeAppearance,
	readCachedAppearance,
} from "./appearance";
import { DEFAULT_APPEARANCE } from "./settings.types";

function createMemoryStorage() {
	const store = new Map<string, string>();

	return {
		clear() {
			store.clear();
		},
		getItem(key: string) {
			return store.get(key) ?? null;
		},
		removeItem(key: string) {
			store.delete(key);
		},
		setItem(key: string, value: string) {
			store.set(key, value);
		},
	};
}

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

describe("brandForegroundFor", () => {
	it("keeps white on the default PageOwl blue", () => {
		expect(brandForegroundFor("#0867f2")).toBe("#ffffff");
	});

	it("keeps white on dark brand colors", () => {
		expect(brandForegroundFor("#2563eb")).toBe("#ffffff");
		expect(brandForegroundFor("#e11d48")).toBe("#ffffff");
	});

	it("switches to ink on light brand colors that fail white contrast", () => {
		expect(brandForegroundFor("#d97706")).toBe("#07152e");
		expect(brandForegroundFor("#059669")).toBe("#07152e");
		expect(brandForegroundFor("#0891b2")).toBe("#07152e");
	});

	it("falls back to white for malformed input", () => {
		expect(brandForegroundFor("nope")).toBe("#ffffff");
		expect(brandForegroundFor("")).toBe("#ffffff");
	});
});

describe("appearance cache", () => {
	beforeEach(() => {
		vi.stubGlobal("window", { localStorage: createMemoryStorage() });
	});

	afterEach(() => {
		vi.unstubAllGlobals();
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

	it("sets a readable brand foreground token", () => {
		expect(APPEARANCE_BOOTSTRAP_SCRIPT).toContain("--brand-foreground");
	});

	it("does not throw when storage is unavailable", () => {
		expect(() => new Function(APPEARANCE_BOOTSTRAP_SCRIPT)()).not.toThrow();
	});
});
