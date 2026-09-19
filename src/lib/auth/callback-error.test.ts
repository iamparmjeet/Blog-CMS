import { describe, expect, it } from "vitest";
import { redirectClaimedInstanceCallback } from "./callback-error";
import { OWNER_CLAIMED_MESSAGE } from "./owner";

describe("redirectClaimedInstanceCallback", () => {
	it("redirects an owner-claim rejection from an OAuth callback to login", async () => {
		const request = new Request(
			"http://localhost:3000/api/auth/callback/google",
		);
		const response = Response.json(
			{ message: OWNER_CLAIMED_MESSAGE },
			{ status: 400 },
		);

		const result = await redirectClaimedInstanceCallback(request, response);

		expect(result.status).toBe(302);
		expect(result.headers.get("location")).toBe(
			"http://localhost:3000/login?error=instance-claimed",
		);
	});

	it("leaves other auth responses unchanged", async () => {
		const request = new Request(
			"http://localhost:3000/api/auth/callback/google",
		);
		const response = Response.json(
			{ message: "OAuth provider unavailable" },
			{ status: 400 },
		);

		const result = await redirectClaimedInstanceCallback(request, response);

		expect(result).toBe(response);
	});

	it("leaves a claimed response outside an OAuth callback unchanged", async () => {
		const request = new Request("http://localhost:3000/api/auth/get-session");
		const response = Response.json(
			{ message: OWNER_CLAIMED_MESSAGE },
			{ status: 400 },
		);

		const result = await redirectClaimedInstanceCallback(request, response);

		expect(result).toBe(response);
	});
});
