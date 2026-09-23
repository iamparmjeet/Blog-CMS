export type ThemeMode = "system" | "day" | "night";

export interface AppearanceSettings {
	themeMode: ThemeMode;
	accentColor: string;
	surfaceTint: string;
}

export const DEFAULT_APPEARANCE: AppearanceSettings = {
	themeMode: "day",
	accentColor: "#0867f2",
	surfaceTint: "",
};

export interface SettingsForm {
	accentColor: string;
	themeMode: ThemeMode;
	surfaceTint: string;
	allowedOrigins: string;
	bio: string;
	blogTitle: string;
	defaultModel: string;
	displayName: string;
	domain: string;
	timeZone: string;
	readingTime: boolean;
	rssFeed: boolean;
	seoMeta: boolean;
	umamiShareUrl: string;
	writingSample: string;
	writingStyle: string;
}

export interface StorageSettings {
	accountId: string;
	bucketName: string;
	publicUrl: string;
	connected: boolean;
}

export const ACCENT_SWATCHES = [
	"#0867f2",
	"#2563eb",
	"#059669",
	"#e11d48",
	"#d97706",
	"#0891b2",
] as const;

export const MODEL_OPTIONS = [
	{
		label: "GLM 5.3 Flash · cheapest, fast",
		value: "z-ai/glm-5.3-flash",
	},
	{
		label: "GPT-5.6 Luna · fast, light OpenAI",
		value: "openai/gpt-5.6-luna",
	},
	{
		label: "DeepSeek V4 Flash · cheapest DeepSeek",
		value: "deepseek/deepseek-v4-flash-0731",
	},
];

export const DEFAULT_SETTINGS: SettingsForm = {
	accentColor: "#0867f2",
	themeMode: "day",
	surfaceTint: "",
	allowedOrigins: "",
	bio: "",
	blogTitle: "ContentOS",
	defaultModel: MODEL_OPTIONS[0]?.value ?? "z-ai/glm-5.3-flash",
	displayName: "",
	domain: "",
	timeZone: "Asia/Kolkata",
	readingTime: false,
	rssFeed: true,
	seoMeta: true,
	umamiShareUrl: "",
	writingSample: "",
	writingStyle: "",
};

export const DEFAULT_STORAGE: StorageSettings = {
	accountId: "",
	bucketName: "",
	publicUrl: "",
	connected: false,
};
