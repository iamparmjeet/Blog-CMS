import {
	getRequestHeaders,
	setResponseStatus,
} from "@tanstack/react-start/server";

import { auth } from "./auth";

export async function getRequestSession() {
	const headers = getRequestHeaders();

	return auth.api.getSession({
		headers,
	});
}

export async function requireSession() {
	const session = await getRequestSession();

	if (!session) {
		setResponseStatus(401);
		throw new Error("Unauthorized");
	}

	return session;
}
