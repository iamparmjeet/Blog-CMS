import { getDb } from "#/db";
import type { AppearanceSettings } from "../settings.types";
import {
	type AppearanceInput,
	type FeedSettingsInput,
	readAppearance,
	readFeedSettings,
	upsertAppearance,
	upsertFeedSettings,
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

export async function readFeedSettingsForOwner(
	userId: string,
): Promise<FeedSettingsInput> {
	return readFeedSettings(getDb(), userId);
}

export async function saveFeedSettingsForOwner(
	userId: string,
	input: FeedSettingsInput,
): Promise<FeedSettingsInput> {
	return upsertFeedSettings(getDb(), userId, input);
}
