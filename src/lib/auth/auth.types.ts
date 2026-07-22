import type { auth } from "./auth";

export type AuthSession = typeof auth.$Infer.Session;

export type AuthUser = AuthSession["user"];

export type AuthenticatedUser = Pick<
	AuthUser,
	"id" | "name" | "email" | "emailVerified"
> & {
	image: string | null;
};

export function toAuthenticatedUser(user: AuthUser): AuthenticatedUser {
	return {
		id: user.id,
		name: user.name,
		email: user.email,
		image: user.image ?? null,
		emailVerified: user.emailVerified,
	};
}
