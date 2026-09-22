import { getDb } from "#/db";
import {
	selectFeedSettings,
	selectInstanceOwnerId,
	selectPublishedFeedPostBySlug,
	selectPublishedFeedPosts,
} from "./feed.query";
import type { FeedCollection } from "./feed.types";
import {
	evaluateFeedCors,
	jsonFeedResponse,
	parseAllowedOrigins,
	toFeedPost,
} from "./feed.utils";

async function loadFeedContext(): Promise<{
	allowedOrigins: string[];
	domain: string | null;
	ownerId: string | null;
}> {
	const db = getDb();
	const ownerId = await selectInstanceOwnerId(db);

	if (!ownerId) {
		return { allowedOrigins: [], domain: null, ownerId: null };
	}

	const feedSettings = await selectFeedSettings(db, ownerId);

	return {
		allowedOrigins: parseAllowedOrigins(feedSettings?.allowedOrigins),
		domain: feedSettings?.domain ?? null,
		ownerId,
	};
}

function preflightResponse(
	cors: ReturnType<typeof evaluateFeedCors>,
): Response {
	return new Response(null, { status: 204, headers: cors.headers });
}

function originDeniedResponse(
	cors: ReturnType<typeof evaluateFeedCors>,
): Response {
	return jsonFeedResponse({ error: "Origin not allowed" }, 403, cors.headers);
}

export async function handleFeedCollection(
	request: Request,
): Promise<Response> {
	const { allowedOrigins, domain, ownerId } = await loadFeedContext();
	const cors = evaluateFeedCors(request, allowedOrigins);

	if (!cors.allowed) {
		return originDeniedResponse(cors);
	}

	if (request.method === "OPTIONS") {
		return preflightResponse(cors);
	}

	if (!ownerId) {
		const empty: FeedCollection = { posts: [] };
		return jsonFeedResponse(empty, 200, cors.headers);
	}

	const rows = await selectPublishedFeedPosts(getDb(), ownerId);
	const posts = rows.map((row) =>
		toFeedPost(row, { domain, requestUrl: request.url }),
	);

	return jsonFeedResponse(
		{ posts } satisfies FeedCollection,
		200,
		cors.headers,
	);
}

export async function handleFeedPost(
	request: Request,
	slug: string,
): Promise<Response> {
	const { allowedOrigins, domain, ownerId } = await loadFeedContext();
	const cors = evaluateFeedCors(request, allowedOrigins);

	if (!cors.allowed) {
		return originDeniedResponse(cors);
	}

	if (request.method === "OPTIONS") {
		return preflightResponse(cors);
	}

	const row =
		ownerId !== null
			? await selectPublishedFeedPostBySlug(getDb(), ownerId, slug)
			: undefined;

	if (!row) {
		return jsonFeedResponse({ error: "Post not found" }, 404, cors.headers);
	}

	return jsonFeedResponse(
		toFeedPost(row, { domain, requestUrl: request.url }),
		200,
		cors.headers,
	);
}
