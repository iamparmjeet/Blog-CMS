import type { DashboardData } from "#/features/dashboard/functions/dashboard.types";
import { buildDashboardData } from "#/features/dashboard/functions/dashboard.utils";
import type { WritingActivityRow } from "#/features/dashboard/writing-activity/writing.types";
import {
	addDays,
	buildWritingActivityHeatmap,
	getHeatmapStartDate,
} from "#/features/dashboard/writing-activity/writing.utils";
import type { PostStatus } from "#/features/posts/functions/posts.types";

export const DEMO_TIME_ZONE = "Asia/Kolkata";
export const DEMO_ACCENT_COLOR = "#0867f2";

export interface DemoPost {
	id: number;
	title: string;
	slug: string;
	status: PostStatus;
	wordCount: number;
	updatedAt: string;
	body: string;
	seoTitle: string;
	description: string;
}

interface DemoPostDefinition {
	title: string;
	slug: string;
	status: PostStatus;
	hoursAgo: number;
	seoTitle: string;
	description: string;
	body: string;
}

const HOUR_MS = 60 * 60 * 1000;

const POST_DEFINITIONS: readonly DemoPostDefinition[] = [
	{
		title: "Why I Ditched Notion for a Custom CMS",
		slug: "why-i-ditched-notion",
		status: "published",
		hoursAgo: 3,
		seoTitle: "Why I ditched Notion for a custom CMS",
		description:
			"Three years of organizing instead of writing, and the three weeks that fixed it.",
		body: `<h2>The sluggishness was mental</h2><p>After three years of using Notion, I finally built something that matches how I think. This is not a hot take about tools. It is about the cost of managing a system when all I wanted to do was write.</p><blockquote>It started with the sluggishness.</blockquote><p>Not performance sluggishness. The mental cost of deciding where a draft belongs, which database it lives in, and which view I should open before typing a sentence.</p><h2>What replaced it</h2><p>One editor, one list of posts, and one publish switch. No nested databases, no board views, no templates to maintain. Drafts autosave. The public feed is a URL I control.</p><ul><li>Write in a single editor</li><li>Publish to my own domain</li><li>Keep every post in a database I can export</li></ul><p>Three weeks of evenings. The result is a CMS shaped exactly to how I write, with zero features I did not personally need.</p>`,
	},
	{
		title: "Building PageOwl in Public: Week 3",
		slug: "building-pageowl-in-public-week-3",
		status: "draft",
		hoursAgo: 26,
		seoTitle: "Building PageOwl in public: week 3",
		description: "What shipped this week, and what I cut.",
		body: `<h2>Shipped</h2><p>This week the marketing site got a real mobile menu, the dashboard stopped guessing at my writing rhythm, and slugs now follow the title until I edit them.</p><p>Cut: a comments system. The policy is written down and the answer is no for now.</p><h2>Next</h2><p>Repurposing needs a longer memory. Threads that reference yesterday's post should not start from zero.</p>`,
	},
	{
		title: "The Case for Owning Your Writing Stack",
		slug: "owning-your-writing-stack",
		status: "published",
		hoursAgo: 24 * 4,
		seoTitle: "The case for owning your writing stack",
		description:
			"Subscription tools rent you your own archive. Self-hosting buys it back.",
		body: `<p>Every writing tool I have paid for eventually changed its pricing, its export format, or its mind. The words stayed mine, but the shape of them did not.</p><h2>What owning means</h2><p>Owning the stack means the database is a file, the feed is a URL, and the export is not a feature request. It means the editor can be replaced without losing the archive.</p><blockquote>The best tool is the one shaped to how you think.</blockquote><p>Self-hosting is not free. It costs an evening and a Cloudflare account. That is a trade I would make again.</p>`,
	},
	{
		title: "How I Repurpose One Post into Five",
		slug: "repurpose-one-post-into-five",
		status: "scheduled",
		hoursAgo: 24 * 6,
		seoTitle: "How I repurpose one post into five",
		description:
			"One article, five platforms, and the rule that keeps the voice intact.",
		body: `<p>Publishing once and syndicating everywhere is how a small audience compounds. The rule: never paste the same text twice.</p><ul><li>A thread that keeps the argument and drops the throat-clearing</li><li>A LinkedIn post that opens with the lesson, not the story</li><li>An Instagram caption built around one line</li></ul><p>The repurpose panel lives next to the editor so the source stays open. Nothing publishes itself.</p>`,
	},
	{
		title: "Notes on Slow Software",
		slug: "notes-on-slow-software",
		status: "draft",
		hoursAgo: 24 * 9,
		seoTitle: "Notes on slow software",
		description: "Tools that wait for you instead of interrupting you.",
		body: `<p>Slow software is not laggy software. It is software that refuses to interrupt, that saves quietly, and that treats your attention as the scarce resource.</p><p>Notes for a longer piece about interfaces that disappear.</p>`,
	},
];

export function countWordsInHtml(html: string): number {
	const text = html
		.replace(/<[^>]*>/g, " ")
		.replace(/&[a-z#0-9]+;/gi, " ")
		.trim();

	return text ? text.split(/\s+/).filter(Boolean).length : 0;
}

export function buildDemoPosts(now: Date): DemoPost[] {
	return POST_DEFINITIONS.map((definition, index) => ({
		id: index + 1,
		title: definition.title,
		slug: definition.slug,
		status: definition.status,
		wordCount: countWordsInHtml(definition.body),
		updatedAt: new Date(
			now.getTime() - definition.hoursAgo * HOUR_MS,
		).toISOString(),
		body: definition.body,
		seoTitle: definition.seoTitle,
		description: definition.description,
	}));
}

export function buildDemoActivityRows(today: string): WritingActivityRow[] {
	const rows: WritingActivityRow[] = [];
	let day = getHeatmapStartDate(today);
	let index = 0;

	while (day <= today) {
		const isRestDay = index % 7 === 0 || index % 5 === 3;

		if (!isRestDay) {
			rows.push({
				activityDate: day,
				wordsAdded: 20 + ((index * 31) % 110),
			});
		}

		day = addDays(day, 1);
		index += 1;
	}

	return rows;
}

export function buildDemoDashboard(
	posts: readonly DemoPost[],
	today: string,
): DashboardData {
	const summary = buildDashboardData(
		posts.map((post) => ({
			id: post.id,
			title: post.title,
			status: post.status,
			wordCount: post.wordCount,
			updatedAt: new Date(post.updatedAt),
		})),
		DEMO_ACCENT_COLOR,
	);

	const activity = buildWritingActivityHeatmap({
		rows: buildDemoActivityRows(today),
		today,
		timeZone: DEMO_TIME_ZONE,
	});

	return { ...summary, activity };
}
