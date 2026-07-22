import { createServerFn } from "@tanstack/react-start";
import { db } from "#/db";
import { user } from "#/db/auth-schema";

export const checkUserExists = createServerFn({ method: "GET" }).handler(
	async () => {
		try {
			const [existingUser] = await db
				.select({ id: user.id })
				.from(user)
				.limit(1);

			return {
				hasUser: existingUser !== undefined,
			};
		} catch (error) {
			console.error("Failed to check whether an owner exists", error);
			throw error;
		}
	},
);
