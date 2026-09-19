import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { db } from "#/db";
import * as authSchema from "#/db/auth-schema";
import { user } from "#/db/auth-schema";
import { env } from "#/env";
import { assertOwnerClaimAllowed } from "./owner";

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "sqlite",
		schema: authSchema,
	}),
	baseURL: env.BETTER_AUTH_URL,
	secret: env.BETTER_AUTH_SECRET,

	socialProviders: {
		google: {
			clientId: env.GOOGLE_CLIENT_ID,
			clientSecret: env.GOOGLE_CLIENT_SECRET,
		},
		github: {
			clientId: env.GITHUB_CLIENT_ID,
			clientSecret: env.GITHUB_CLIENT_SECRET,
		},
	},

	databaseHooks: {
		user: {
			create: {
				before: async (incomingUser) => {
					const [existingOwner] = await db
						.select({ email: user.email })
						.from(user)
						.limit(1);

					// OAuth provisioning always carries an email
					if (!incomingUser.email) {
						if (existingOwner) {
							throw new APIError("BAD_REQUEST", {
								message: "This instance has already been claimed.",
							});
						}
						return;
					}
					assertOwnerClaimAllowed(existingOwner?.email, incomingUser.email);
				},
			},
		},
	},

	plugins: [tanstackStartCookies()],
});
