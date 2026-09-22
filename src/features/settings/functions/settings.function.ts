import { createServerFn } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";
import { requireSession } from "#/lib/auth/auth.server";
import { appearanceInputSchema } from "./settings.query";
import {
	readAppearanceForOwner,
	saveAppearanceForOwner,
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
