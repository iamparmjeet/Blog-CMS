import { createServerFn } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";
import { requireSession } from "#/lib/auth/auth.server";
import { readReadyMediaByOwner } from "./media-list.server";

export const listMedia = createServerFn({ method: "GET" }).handler(async () => {
	const session = await requireSession();

	setResponseHeaders(
		new Headers({
			"Cache-Control": "no-store",
			Vary: "Cookie, Authorization",
		}),
	);

	return readReadyMediaByOwner(session.user.id);
});
