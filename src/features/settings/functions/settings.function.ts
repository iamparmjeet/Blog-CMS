import { createServerFn } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";
import { requireSession } from "#/lib/auth/auth.server";
import {
	appearanceInputSchema,
	feedSettingsInputSchema,
} from "./settings.query";
import {
	readAppearanceForOwner,
	readFeedSettingsForOwner,
	saveAppearanceForOwner,
	saveFeedSettingsForOwner,
} from "./settings.server";

export const getAppearanceSettings = createServerFn({ method: "GET" }).handler(
	async () => {
		const session = await requireSession();

		setResponseHeaders(
			new Headers({
				"Cache-Control": "no-store",
				Vary: "Cookie, Authorization",
			}),
		);

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

		setResponseHeaders(
			new Headers({
				"Cache-Control": "no-store",
				Vary: "Cookie, Authorization",
			}),
		);

		return readFeedSettingsForOwner(session.user.id);
	},
);

export const saveFeedSettings = createServerFn({ method: "POST" })
	.validator(feedSettingsInputSchema)
	.handler(async ({ data }) => {
		const session = await requireSession();

		return saveFeedSettingsForOwner(session.user.id, data);
	});
