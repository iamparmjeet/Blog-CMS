import { describe, expect, it } from "vitest";
import {
	assertOwnerClaimAllowed,
	decideOwnerClaim,
	normalizeOwnerEmail,
} from "./owner";

describe("decideOwnerClaim", () => {
	it("allows the first claim when no owner exists", () => {
		expect(decideOwnerClaim(null, "owner@example.com")).toBe(
			"allow-first-claim",
		);
		expect(decideOwnerClaim(undefined, "owner@example.com")).toBe(
			"allow-first-claim",
		);
		expect(decideOwnerClaim("", "owner@example.com")).toBe("allow-first-claim");
	});

	it("allows the owner to return with the same email", () => {
		expect(decideOwnerClaim("owner@example.com", "owner@example.com")).toBe(
			"allow-owner-return",
		);
	});

	it("matches owner email case-insensitively with surrounding whitespace", () => {
		expect(decideOwnerClaim("Owner@example.com", "owner@example.COM")).toBe(
			"allow-owner-return",
		);
	});
	it("rejects a second distinct user", () => {
		expect(decideOwnerClaim("owner@example.com", "intruder@example.com")).toBe(
			"reject-second-user",
		);
	});
});

describe("normalizeOwnerEmail", () => {
	it("trims and lowercases", () => {
		expect(normalizeOwnerEmail("  Owner@Example.com ")).toBe(
			"owner@example.com",
		);
	});
});

describe("assertOwnerClaimAllowed", () => {
	it("does not throw for first claim or owner return", () => {
		expect(() =>
			assertOwnerClaimAllowed(null, "owner@example.com"),
		).not.toThrow();
		expect(() =>
			assertOwnerClaimAllowed("owner@example.com", "OWNER@example.com"),
		).not.toThrow();
	});

	it("throws the claimed message for a second user", () => {
		expect(() =>
			assertOwnerClaimAllowed("owner@example.com", "intruder@example.com"),
		).toThrow("This instance has already been claimed.");
	});
});
