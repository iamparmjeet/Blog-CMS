import type { AppearanceSettings, ThemeMode } from "./settings.types";
import { DEFAULT_APPEARANCE } from "./settings.types";

export const APPEARANCE_STORAGE_KEY = "contentos-appearance";

export type AppliedAppearance = AppearanceSettings;

const THEME_MODES: readonly ThemeMode[] = ["system", "day", "night"];

function isThemeMode(value: unknown): value is ThemeMode {
	return typeof value === "string" && (THEME_MODES as string[]).includes(value);
}

function isHexColor(value: unknown): value is string {
	return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

export function normalizeAppearance(
	input: Partial<AppearanceSettings> | null | undefined,
): AppliedAppearance {
	return {
		themeMode:
			input && isThemeMode(input.themeMode)
				? input.themeMode
				: DEFAULT_APPEARANCE.themeMode,
		accentColor:
			input && isHexColor(input.accentColor)
				? input.accentColor
				: DEFAULT_APPEARANCE.accentColor,
		surfaceTint:
			input && typeof input.surfaceTint === "string"
				? input.surfaceTint === "" || isHexColor(input.surfaceTint)
					? input.surfaceTint
					: ""
				: DEFAULT_APPEARANCE.surfaceTint,
	};
}

export function readCachedAppearance(): AppliedAppearance {
	if (typeof window === "undefined") {
		return DEFAULT_APPEARANCE;
	}

	try {
		const raw = window.localStorage.getItem(APPEARANCE_STORAGE_KEY);
		if (!raw) {
			return DEFAULT_APPEARANCE;
		}

		return normalizeAppearance(JSON.parse(raw));
	} catch {
		return DEFAULT_APPEARANCE;
	}
}

export function cacheAppearance(appearance: AppliedAppearance): void {
	if (typeof window === "undefined") {
		return;
	}

	try {
		window.localStorage.setItem(
			APPEARANCE_STORAGE_KEY,
			JSON.stringify(appearance),
		);
	} catch {
		// localStorage may be unavailable (private mode); ignore.
	}
}

let systemThemeCleanup: (() => void) | null = null;

function resolveIsDark(themeMode: ThemeMode): boolean {
	if (themeMode === "night") {
		return true;
	}

	if (themeMode === "day") {
		return false;
	}

	return (
		typeof window !== "undefined" &&
		window.matchMedia("(prefers-color-scheme: dark)").matches
	);
}

export function applyAppearance(appearance: AppliedAppearance): void {
	if (typeof document === "undefined") {
		return;
	}

	const root = document.documentElement;

	if (resolveIsDark(appearance.themeMode)) {
		root.classList.add("dark");
	} else {
		root.classList.remove("dark");
	}

	root.style.setProperty("--brand", appearance.accentColor);
	root.style.setProperty("--pageowl-accent", appearance.accentColor);

	const tint =
		appearance.surfaceTint && isHexColor(appearance.surfaceTint)
			? appearance.surfaceTint
			: "";

	if (tint) {
		root.style.setProperty("--surface-tint", tint);
	} else {
		root.style.removeProperty("--surface-tint");
	}

	systemThemeCleanup?.();
	systemThemeCleanup = null;

	if (appearance.themeMode === "system" && typeof window !== "undefined") {
		const media = window.matchMedia("(prefers-color-scheme: dark)");
		const onChange = () => {
			if (media.matches) {
				root.classList.add("dark");
			} else {
				root.classList.remove("dark");
			}
		};

		media.addEventListener("change", onChange);
		systemThemeCleanup = () => media.removeEventListener("change", onChange);
	}
}

export function setAppearance(appearance: AppliedAppearance): void {
	cacheAppearance(appearance);
	applyAppearance(appearance);
}

/**
 * Inline head script that applies cached appearance before first paint.
 * Kept as a string so __root.tsx can inject it without a module round-trip.
 */
export const APPEARANCE_BOOTSTRAP_SCRIPT = `(function(){try{var raw=localStorage.getItem(${JSON.stringify(APPEARANCE_STORAGE_KEY)});var input=raw?JSON.parse(raw):null;var modes=["system","day","night"];var mode=input&&modes.indexOf(input.themeMode)>=0?input.themeMode:"day";var dark=mode==="night"?true:mode==="day"?false:window.matchMedia("(prefers-color-scheme: dark)").matches;var root=document.documentElement;if(dark){root.classList.add("dark")}else{root.classList.remove("dark")}var hex=/^#[0-9a-fA-F]{6}$/;if(input&&typeof input.accentColor==="string"&&hex.test(input.accentColor)){root.style.setProperty("--brand",input.accentColor);root.style.setProperty("--pageowl-accent",input.accentColor)}if(input&&typeof input.surfaceTint==="string"&&hex.test(input.surfaceTint)){root.style.setProperty("--surface-tint",input.surfaceTint)}}catch(e){}})();`;
