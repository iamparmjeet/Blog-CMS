import { createServerFn } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";
import { requireSession } from "#/lib/auth/auth.server";
import {
	accountInputSchema,
	appearanceInputSchema,
	feedSettingsInputSchema,
	identityInputSchema,
	publishingInputSchema,
} from "./settings.query";
import {
	readAppearanceForOwner,
	readFeedSettingsForOwner,
	readOwnerProfileForOwner,
	readStorageInfo,
	saveAccountForOwner,
	saveAppearanceForOwner,
	saveFeedSettingsForOwner,
	saveIdentityForOwner,
	savePublishingForOwner,
} from "./settings.server";

function noStoreHeaders() {
	setResponseHeaders(
		new Headers({
			"Cache-Control": "no-store",
			Vary: "Cookie, Authorization",
		}),
	);
}

export const getAppearanceSettings = createServerFn({ method: "GET" }).handler(
	async () => {
		const session = await requireSession();

		noStoreHeaders();

		return readAppearanceForOwner(session.user.id);
	},
);

export const saveAppearanceSettings = createServerFn({
	method: "POST",
})
	.validator(appearanceInputSchema)
	.handler(async ({ data }) => {
		const session = await requireSession();

		return saveAppearanceForOwner(session.user.id, data);
	});

export const getFeedSettings = createServerFn({ method: "GET" }).handler(
	async () => {
		const session = await requireSession();

		noStoreHeaders();

		return readFeedSettingsForOwner(session.user.id);
	},
);

export const saveFeedSettings = createServerFn({ method: "POST" })
	.validator(feedSettingsInputSchema)
	.handler(async ({ data }) => {
		const session = await requireSession();

		return saveFeedSettingsForOwner(session.user.id, data);
	});

export const getOwnerSettings = createServerFn({ method: "GET" }).handler(
	async () => {
		const session = await requireSession();

		noStoreHeaders();

		return readOwnerProfileForOwner(session.user.id);
	},
);

export const saveIdentitySettings = createServerFn({
	method: "POST",
})
	.validator(identityInputSchema)
	.handler(async ({ data }) => {
		const session = await requireSession();

		await saveIdentityForOwner(session.user.id, data);
	});

export const saveAccountSettings = createServerFn({
	method: "POST",
})
	.validator(accountInputSchema)
	.handler(async ({ data }) => {
		const session = await requireSession();

		await saveAccountForOwner(session.user.id, data);
	});

export const savePublishingSettings = createServerFn({
	method: "POST",
})
	.validator(publishingInputSchema)
	.handler(async ({ data }) => {
		const session = await requireSession();

		await savePublishingForOwner(session.user.id, data);
	});

export const getStorageSettings = createServerFn({ method: "GET" }).handler(
	async () => {
		await requireSession();

		noStoreHeaders();

		return readStorageInfo();
	},
);
