import { OWNER_CLAIMED_MESSAGE } from "./owner";

export async function redirectClaimedInstanceCallback(
	request: Request,
	response: Response,
): Promise<Response> {
	const { pathname } = new URL(request.url);

	if (!pathname.startsWith("/api/auth/callback/") || response.ok) {
		return response;
	}

	const body = await response
		.clone()
		.json()
		.catch(() => null);

	if (
		!body ||
		typeof body !== "object" ||
		!("message" in body) ||
		body.message !== OWNER_CLAIMED_MESSAGE
	) {
		return response;
	}

	const loginUrl = new URL("/login", request.url);
	loginUrl.searchParams.set("error", "instance-claimed");

	return Response.redirect(loginUrl, 302);
}
