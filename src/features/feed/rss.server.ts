import type { Db } from "#/db";
import {
	selectFeedSettings,
	selectInstanceOwnerId,
	selectPublishedFeedPosts,
} from "./feed.query";
import { buildFeedPostUrl } from "./feed.utils";

export interface RssItem {
	title: string;
	link: string;
	description: string;
	publishedAt: Date | null;
}

export interface RssChannel {
	siteTitle: string;
	siteUrl: string;
	siteDescription: string;
	items: RssItem[];
}

export function escapeXml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

export function buildRssXml(channel: RssChannel): string {
	const items = channel.items
		.map(
			(item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <guid>${escapeXml(item.link)}</guid>
      <description>${escapeXml(item.description)}</description>${item.publishedAt ? `\n      <pubDate>${item.publishedAt.toUTCString()}</pubDate>` : ""}
    </item>`,
		)
		.join("\n");

	return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(channel.siteTitle)}</title>
    <link>${escapeXml(channel.siteUrl)}</link>
    <description>${escapeXml(channel.siteDescription)}</description>
${items ? `${items}\n` : ""}  </channel>
</rss>
`;
}

function siteBaseUrl(requestUrl: string, domain: string | null): string {
	if (domain?.trim()) {
		const base = domain.startsWith("http")
			? domain
			: `https://${domain.trim()}`;

		try {
			return new URL("/", base).toString().replace(/\/$/, "");
		} catch {
			// fall through to the request-derived URL
		}
	}

	return new URL(requestUrl).origin;
}

/**
 * Serves the owner's published posts as RSS 2.0, gated by the rssFeed
 * publishing toggle. Drafts, scheduled, archived, and soft-deleted posts
 * never appear; a disabled toggle answers 404 with no content.
 */
export async function handleRssFeed(
	request: Request,
	db: Db,
): Promise<Response> {
	const ownerId = await selectInstanceOwnerId(db);

	if (!ownerId) {
		return new Response("Not found", { status: 404 });
	}

	const feedSettings = await selectFeedSettings(db, ownerId);

	if (!feedSettings || !feedSettings.rssFeed) {
		return new Response("Not found", { status: 404 });
	}

	const siteUrl = siteBaseUrl(request.url, feedSettings.domain);
	const rows = await selectPublishedFeedPosts(db, ownerId);

	const xml = buildRssXml({
		siteTitle: feedSettings.blogTitle?.trim() || "ContentOS",
		siteUrl,
		siteDescription: feedSettings.bio ?? "",
		items: rows.map((row) => ({
			title: row.title,
			link: buildFeedPostUrl({
				domain: feedSettings.domain,
				requestUrl: request.url,
				slug: row.slug,
			}),
			description: row.description,
			publishedAt: row.publishedAt,
		})),
	});

	return new Response(xml, {
		status: 200,
		headers: {
			"content-type": "application/rss+xml; charset=utf-8",
			"cache-control": "public, max-age=300",
		},
	});
}
