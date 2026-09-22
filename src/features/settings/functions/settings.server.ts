import { getDb } from "#/db";
import type { AppearanceSettings } from "../settings.types";
import {
	type AppearanceInput,
	readAppearance,
	upsertAppearance,
} from "./settings.query";

export async function readAppearanceForOwner(
	userId: string,
): Promise<AppearanceSettings> {
	return readAppearance(getDb(), userId);
}

export async function saveAppearanceForOwner(
	userId: string,
	input: AppearanceInput,
): Promise<AppearanceSettings> {
	return upsertAppearance(getDb(), userId, input);
}
