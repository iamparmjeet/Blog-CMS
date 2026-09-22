import { eq } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "#/db";
import { settings } from "#/db/schema";
import type { AppearanceSettings } from "../settings.types";
import { DEFAULT_APPEARANCE } from "../settings.types";

export const appearanceInputSchema = z.object({
	themeMode: z.enum(["system", "day", "night"]),
	accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
	surfaceTint: z.string().regex(/^(|#[0-9a-fA-F]{6})$/),
});

export type AppearanceInput = z.infer<typeof appearanceInputSchema>;

export const feedSettingsInputSchema = z.object({
	allowedOrigins: z.string().max(4000),
});

export type FeedSettingsInput = z.infer<typeof feedSettingsInputSchema>;

const DOMAIN_HOSTNAME =
	/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/iu;

function isValidDomainValue(value: string): boolean {
	if (value === "") {
		return true;
	}
	if (/^https?:\/\//iu.test(value)) {
		try {
			const url = new URL(value);
			return (
				url.hostname.includes(".") &&
				url.pathname === "/" &&
				url.search === "" &&
				url.hash === ""
			);
		} catch {
			return false;
		}
	}
	return DOMAIN_HOSTNAME.test(value);
}

function isValidTimeZone(value: string): boolean {
	try {
		new Intl.DateTimeFormat("en-US", { timeZone: value });
		return true;
	} catch {
		return false;
	}
}

function isEmptyOrHttpUrl(value: string): boolean {
	if (value === "") {
		return true;
	}
	try {
		const url = new URL(value);
		return url.protocol === "http:" || url.protocol === "https:";
	} catch {
		return false;
	}
}

export const identityInputSchema = z.object({
	blogTitle: z.string().trim().max(120),
	domain: z.string().trim().max(253).refine(isValidDomainValue),
	bio: z.string().trim().max(1000),
});

export type IdentityInput = z.infer<typeof identityInputSchema>;

export const accountInputSchema = z.object({
	displayName: z.string().trim().max(80),
	defaultModel: z.string().trim().min(1).max(120),
	writingStyle: z.string().trim().max(4000),
	writingSample: z.string().trim().max(20000),
});

export type AccountInput = z.infer<typeof accountInputSchema>;

export const publishingInputSchema = z.object({
	timeZone: z.string().trim().min(1).max(64).refine(isValidTimeZone),
	umamiShareUrl: z
		.string()
		.trim()
		.max(2048)
		.refine(isEmptyOrHttpUrl, "Must be empty or an http(s) URL"),
});

export type PublishingInput = z.infer<typeof publishingInputSchema>;

const ThemeModeSchema = z.enum(["system", "day", "night"]);
const HexSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);

function normalizeThemeMode(
	value: string | null | undefined,
): AppearanceSettings["themeMode"] {
	const result = ThemeModeSchema.safeParse(value);
	return result.success ? result.data : DEFAULT_APPEARANCE.themeMode;
}

function normalizeAccent(value: string | null | undefined): string {
	const result = HexSchema.safeParse(value);
	return result.success ? result.data : DEFAULT_APPEARANCE.accentColor;
}

function normalizeTint(value: string | null | undefined): string {
	if (value == null || value === "") {
		return "";
	}
	const result = HexSchema.safeParse(value);
	return result.success ? result.data : "";
}

export async function readAppearance(
	db: Db,
	userId: string,
): Promise<AppearanceSettings> {
	const row = await db
		.select({
			themeMode: settings.themeMode,
			accentColor: settings.accentColor,
			surfaceTint: settings.surfaceTint,
		})
		.from(settings)
		.where(eq(settings.userId, userId))
		.limit(1)
		.get();

	if (!row) {
		return DEFAULT_APPEARANCE;
	}

	return {
		themeMode: normalizeThemeMode(row.themeMode),
		accentColor: normalizeAccent(row.accentColor),
		surfaceTint: normalizeTint(row.surfaceTint),
	};
}

export async function upsertAppearance(
	db: Db,
	userId: string,
	input: AppearanceInput,
): Promise<AppearanceSettings> {
	const values = {
		userId,
		themeMode: input.themeMode,
		accentColor: input.accentColor,
		surfaceTint: input.surfaceTint,
	};

	await db
		.insert(settings)
		.values(values)
		.onConflictDoUpdate({
			target: settings.userId,
			set: {
				themeMode: input.themeMode,
				accentColor: input.accentColor,
				surfaceTint: input.surfaceTint,
			},
		});

	return {
		themeMode: input.themeMode,
		accentColor: input.accentColor,
		surfaceTint: input.surfaceTint,
	};
}

export async function readFeedSettings(
	db: Db,
	userId: string,
): Promise<FeedSettingsInput> {
	const row = await db
		.select({ allowedOrigins: settings.allowedOrigins })
		.from(settings)
		.where(eq(settings.userId, userId))
		.limit(1)
		.get();

	return { allowedOrigins: row?.allowedOrigins ?? "" };
}

export async function upsertFeedSettings(
	db: Db,
	userId: string,
	input: FeedSettingsInput,
): Promise<FeedSettingsInput> {
	const values = {
		userId,
		allowedOrigins: input.allowedOrigins,
	};

	await db
		.insert(settings)
		.values(values)
		.onConflictDoUpdate({
			target: settings.userId,
			set: { allowedOrigins: input.allowedOrigins },
		});

	return { allowedOrigins: input.allowedOrigins };
}

export interface OwnerSettingsProfile {
	displayName: string;
	blogTitle: string;
	domain: string;
	bio: string;
	timeZone: string;
	defaultModel: string;
	writingStyle: string;
	writingSample: string;
	umamiShareUrl: string;
}

export const DEFAULT_PROFILE: OwnerSettingsProfile = {
	displayName: "",
	blogTitle: "ContentOS",
	domain: "",
	bio: "",
	timeZone: "Asia/Kolkata",
	defaultModel: "google/gemini-2.5-flash",
	writingStyle: "",
	writingSample: "",
	umamiShareUrl: "",
};

function normalizeText(value: string | null | undefined): string {
	return value ?? "";
}

export async function readOwnerProfile(
	db: Db,
	userId: string,
): Promise<OwnerSettingsProfile> {
	const row = await db
		.select({
			displayName: settings.displayName,
			blogTitle: settings.blogTitle,
			domain: settings.domain,
			bio: settings.bio,
			timeZone: settings.timeZone,
			defaultModel: settings.defaultModel,
			writingStyle: settings.writingStyle,
			writingSample: settings.writingSample,
			umamiShareUrl: settings.umamiShareUrl,
		})
		.from(settings)
		.where(eq(settings.userId, userId))
		.limit(1)
		.get();

	if (!row) {
		return { ...DEFAULT_PROFILE };
	}

	return {
		displayName: normalizeText(row.displayName),
		blogTitle: normalizeText(row.blogTitle) || DEFAULT_PROFILE.blogTitle,
		domain: normalizeText(row.domain),
		bio: normalizeText(row.bio),
		timeZone: normalizeText(row.timeZone) || DEFAULT_PROFILE.timeZone,
		defaultModel:
			normalizeText(row.defaultModel) || DEFAULT_PROFILE.defaultModel,
		writingStyle: normalizeText(row.writingStyle),
		writingSample: normalizeText(row.writingSample),
		umamiShareUrl: normalizeText(row.umamiShareUrl),
	};
}

async function upsertProfileFields(
	db: Db,
	userId: string,
	fields: Partial<OwnerSettingsProfile>,
): Promise<void> {
	await db
		.insert(settings)
		.values({ userId, ...fields })
		.onConflictDoUpdate({
			target: settings.userId,
			set: fields,
		});
}

export async function upsertIdentity(
	db: Db,
	userId: string,
	input: IdentityInput,
): Promise<void> {
	await upsertProfileFields(db, userId, {
		blogTitle: input.blogTitle,
		domain: input.domain,
		bio: input.bio,
	});
}

export async function upsertAccount(
	db: Db,
	userId: string,
	input: AccountInput,
): Promise<void> {
	await upsertProfileFields(db, userId, {
		displayName: input.displayName,
		defaultModel: input.defaultModel,
		writingStyle: input.writingStyle,
		writingSample: input.writingSample,
	});
}

export async function upsertPublishing(
	db: Db,
	userId: string,
	input: PublishingInput,
): Promise<void> {
	await upsertProfileFields(db, userId, {
		timeZone: input.timeZone,
		umamiShareUrl: input.umamiShareUrl,
	});
}
