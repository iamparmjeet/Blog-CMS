import { APIError } from "better-auth/api";

export const OWNER_CLAIMED_MESSAGE = "This instance has already been claimed.";

/**
 * D2: the instance owner may always sign in; only a *second distinct user*
 * is rejected. Identity is keyed on the verified OAuth email
 * (`user.email` is unique in the auth schema).
 */

export type OwnerClaimDecision =
	| "allow-first-claim"
	| "allow-owner-return"
	| "reject-second-user";

export function normalizeOwnerEmail(email: string): string {
	return email.trim().toLowerCase();
}

export function decideOwnerClaim(
	existingOwnerEmail: string | null | undefined,
	incomingEmail: string,
): OwnerClaimDecision {
	const existing = existingOwnerEmail?.trim().toLowerCase();

	if (!existing) return "allow-first-claim";

	return normalizeOwnerEmail(incomingEmail) === existing
		? "allow-owner-return"
		: "reject-second-user";
}

export function assertOwnerClaimAllowed(
	existingOwnerEmail: string | null | undefined,
	incomingEmail: string,
): void {
	if (
		decideOwnerClaim(existingOwnerEmail, incomingEmail) === "reject-second-user"
	) {
		throw new APIError("BAD_REQUEST", {
			message: OWNER_CLAIMED_MESSAGE,
		});
	}
}
