import { getDb } from "#/db";
import { env } from "#/env";
import type { AppearanceSettings, StorageSettings } from "../settings.types";
import { DEFAULT_STORAGE } from "../settings.types";
import {
	type AccountInput,
	type AppearanceInput,
	type FeedSettingsInput,
	type IdentityInput,
	type OwnerSettingsProfile,
	type PublishingInput,
	readAppearance,
	readFeedSettings,
	readOwnerProfile,
	upsertAccount,
	upsertAppearance,
	upsertFeedSettings,
	upsertIdentity,
	upsertPublishing,
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

export async function readOwnerProfileForOwner(
	userId: string,
): Promise<OwnerSettingsProfile> {
	return readOwnerProfile(getDb(), userId);
}

export async function saveIdentityForOwner(
	userId: string,
	input: IdentityInput,
): Promise<void> {
	await upsertIdentity(getDb(), userId, input);
}

export async function saveAccountForOwner(
	userId: string,
	input: AccountInput,
): Promise<void> {
	await upsertAccount(getDb(), userId, input);
}

export async function savePublishingForOwner(
	userId: string,
	input: PublishingInput,
): Promise<void> {
	await upsertPublishing(getDb(), userId, input);
}

export function readStorageInfo(): StorageSettings {
	const bucketName = env.R2_BUCKET_NAME ?? "";
	const publicUrl = env.R2_PUBLIC_URL ?? "";
	const accountId = env.R2_ACCOUNT_ID ?? "";
	const connected = Boolean(
		bucketName &&
			accountId &&
			publicUrl &&
			env.R2_ACCESS_KEY_ID &&
			env.R2_SECRET_ACCESS_KEY,
	);

	if (!bucketName && !publicUrl && !accountId) {
		return { ...DEFAULT_STORAGE };
	}

	return { accountId, bucketName, publicUrl, connected };
}
