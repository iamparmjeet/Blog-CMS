import type { Db } from "#/db";
import {
	enforceRateLimit,
	RATE_LIMITS,
} from "#/features/rate-limit/rate-limit.query";
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

async function loadFeedContext(db: Db): Promise<{
	allowedOrigins: string[];
	domain: string | null;
	ownerId: string | null;
	seoMeta: boolean;
	readingTime: boolean;
}> {
	const ownerId = await selectInstanceOwnerId(db);

	if (!ownerId) {
		return {
			allowedOrigins: [],
			domain: null,
			ownerId: null,
			seoMeta: true,
			readingTime: false,
		};
	}

	const feedSettings = await selectFeedSettings(db, ownerId);

	return {
		allowedOrigins: parseAllowedOrigins(feedSettings?.allowedOrigins),
		domain: feedSettings?.domain ?? null,
		ownerId,
		seoMeta: feedSettings?.seoMeta ?? true,
		readingTime: feedSettings?.readingTime ?? false,
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
	db: Db,
): Promise<Response> {
	const { allowedOrigins, domain, ownerId, seoMeta, readingTime } =
		await loadFeedContext(db);
	const cors = evaluateFeedCors(request, allowedOrigins);

	if (!cors.allowed) {
		return originDeniedResponse(cors);
	}

	if (request.method === "OPTIONS") {
		return preflightResponse(cors);
	}

	const limited = await enforceRateLimit(
		db,
		request,
		RATE_LIMITS.feedCollection,
	);

	if (limited) {
		return limited;
	}

	if (!ownerId) {
		const empty: FeedCollection = { posts: [] };
		return jsonFeedResponse(empty, 200, cors.headers);
	}

	const rows = await selectPublishedFeedPosts(db, ownerId);
	const posts = rows.map((row) =>
		toFeedPost(row, { domain, requestUrl: request.url, seoMeta, readingTime }),
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
	db: Db,
): Promise<Response> {
	const { allowedOrigins, domain, ownerId, seoMeta, readingTime } =
		await loadFeedContext(db);
	const cors = evaluateFeedCors(request, allowedOrigins);

	if (!cors.allowed) {
		return originDeniedResponse(cors);
	}

	if (request.method === "OPTIONS") {
		return preflightResponse(cors);
	}

	const limited = await enforceRateLimit(db, request, RATE_LIMITS.feedPost);

	if (limited) {
		return limited;
	}

	const row =
		ownerId !== null
			? await selectPublishedFeedPostBySlug(db, ownerId, slug)
			: undefined;

	if (!row) {
		return jsonFeedResponse({ error: "Post not found" }, 404, cors.headers);
	}

	return jsonFeedResponse(
		toFeedPost(row, { domain, requestUrl: request.url, seoMeta, readingTime }),
		200,
		cors.headers,
	);
}
