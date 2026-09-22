export type ThemeMode = "system" | "day" | "night";

export interface AppearanceSettings {
	themeMode: ThemeMode;
	accentColor: string;
	surfaceTint: string;
}

export const DEFAULT_APPEARANCE: AppearanceSettings = {
	themeMode: "night",
	accentColor: "#7c3aed",
	surfaceTint: "",
};

export interface SettingsForm {
	accentColor: string;
	themeMode: ThemeMode;
	surfaceTint: string;
	accountId: string;
	allowedOrigins: string;
	bio: string;
	blogTitle: string;
	bucket: string;
	defaultModel: string;
	displayName: string;
	domain: string;
	publicUrl: string;
	readingTime: boolean;
	rssFeed: boolean;
	seoMeta: boolean;
	umamiShareUrl: string;
	writingSample: string;
	writingStyle: string;
}

export const ACCENT_SWATCHES = [
	"#7c3aed",
	"#2563eb",
	"#059669",
	"#e11d48",
	"#d97706",
	"#0891b2",
] as const;

export const MODEL_OPTIONS = [
	{
		label: "Gemini 2.5 Flash · fast, free tier",
		value: "google/gemini-2.5-flash",
	},
	{
		label: "Claude Haiku 3.5 · fast, cheap",
		value: "anthropic/claude-haiku-3.5",
	},
	{ label: "GPT-4o mini · affordable", value: "openai/gpt-4o-mini" },
	{ label: "Llama 3.3 70B · open weights", value: "meta-llama/llama-3.3-70b" },
];

export const DEFAULT_SETTINGS: SettingsForm = {
	accentColor: "#7c3aed",
	themeMode: "night",
	surfaceTint: "",
	accountId: "",
	allowedOrigins: "",
	bio: "",
	blogTitle: "ContentOS",
	bucket: "content-os-media",
	defaultModel: MODEL_OPTIONS[0]?.value ?? "google/gemini-2.5-flash",
	displayName: "",
	domain: "",
	publicUrl: "",
	readingTime: false,
	rssFeed: true,
	seoMeta: true,
	umamiShareUrl: "",
	writingSample: "",
	writingStyle: "",
};
