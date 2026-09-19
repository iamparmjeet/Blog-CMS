import { createServerFn } from "@tanstack/react-start";
import { db } from "#/db";
import { user } from "#/db/auth-schema";
import { getRequestSession } from "./auth.server";

export const checkUserExists = createServerFn({ method: "GET" }).handler(
	async () => {
		try {
			const [session, existingUser] = await Promise.all([
				getRequestSession(),
				db
					.select({ id: user.id })
					.from(user)
					.limit(1)
					.then(([owner]) => owner),
			]);

			return {
				hasUser: existingUser !== undefined,
				user: session
					? { id: session.user.id, email: session.user.email }
					: null,
			};
		} catch (error) {
			console.error("Failed to check whether an owner exists", error);
			throw error;
		}
	},
);
