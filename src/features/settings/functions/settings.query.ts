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
