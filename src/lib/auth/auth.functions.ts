import { createServerFn } from "@tanstack/react-start";
import { getRequestSession } from "./auth.server";
import type { AuthenticatedUser } from "./auth.types";

export const getSession = createServerFn({ method: "GET" }).handler(
	async () => {
		const session = await getRequestSession();

		if (!session) return null;

		const user: AuthenticatedUser = {
			id: session.user.id,
			name: session.user.name,
			email: session.user.email,
			emailVerified: session.user.emailVerified,
			image: session.user.image ?? null,
		};

		return { user };
	},
);
