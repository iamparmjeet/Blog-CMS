import { z } from "zod";
import type { ChatMessage, GenerationProfile } from "./ai-prompts";

export const REPURPOSE_PLATFORMS = [
	"twitter",
	"linkedin",
	"instagram",
	"reels",
] as const;

export type RepurposePlatform = (typeof REPURPOSE_PLATFORMS)[number];

export const PLATFORM_LABELS: Record<RepurposePlatform, string> = {
	twitter: "X / Twitter",
	linkedin: "LinkedIn",
	instagram: "Instagram",
	reels: "Reels",
};

export const PLATFORM_PROMPTS: Record<RepurposePlatform, string> = {
	twitter: "a Twitter thread",
	linkedin: "a LinkedIn post",
	instagram: "an Instagram caption",
	reels: "a Reels script",
};

const PLATFORM_INSTRUCTIONS: Record<RepurposePlatform, string> = {
	twitter:
		"Write a Twitter thread: open with a hook under 280 characters, follow with numbered posts of at most 280 characters each, and close with a call to action. Number each post (1/, 2/, …).",
	linkedin:
		"Write a LinkedIn post: a professional hook line, short paragraphs with one idea each, and three relevant hashtags at the end. Keep it under 150 words.",
	instagram:
		"Write an Instagram caption: an emotive hook, the core takeaway in two short paragraphs, and five relevant hashtags on their own final line. Keep it under 120 words.",
	reels:
		"Write a Reels script: a 3-second spoken hook, three quick beats labeled HOOK / VALUE / CTA, and on-screen text cues in brackets. Keep the spoken part under 100 words.",
};

export const MAX_REPURPOSE_SOURCE_LENGTH = 6000;

export const repurposeInputSchema = z.object({
	postId: z.number().int().positive(),
	platform: z.enum(REPURPOSE_PLATFORMS),
	model: z.string().trim().min(1).max(120).optional(),
});

export type RepurposeInput = z.infer<typeof repurposeInputSchema>;

export function buildSystemPromptForPlatform(
	profile: GenerationProfile,
	platform: RepurposePlatform,
): string {
	const parts = [
		`You are a repurposing assistant for a single-owner blog. Rewrite the owner's post as ${PLATFORM_PROMPTS[platform]}. Output only the ${PLATFORM_LABELS[platform]} variant text: no explanations, no publication, no status changes.`,
		PLATFORM_INSTRUCTIONS[platform],
	];

	const style = profile.writingStyle.trim();

	if (style) {
		parts.push(`Writing style to match:\n${style}`);
	}

	const sample = profile.writingSample.trim();

	if (sample) {
		parts.push(`Writing sample for voice reference:\n${sample}`);
	}

	return parts.join("\n\n");
}

export function buildRepurposeMessages({
	profile,
	platform,
	title,
	sourceText,
}: {
	profile: GenerationProfile;
	platform: RepurposePlatform;
	title: string;
	sourceText: string;
}): ChatMessage[] {
	const trimmedTitle = title.trim();
	const trimmedSource = sourceText.trim().slice(0, MAX_REPURPOSE_SOURCE_LENGTH);
	const context =
		trimmedTitle && trimmedTitle.toLowerCase() !== "untitled"
			? `Post title: ${trimmedTitle}\n\nPost body:\n${trimmedSource}`
			: `Post body:\n${trimmedSource}`;

	return [
		{
			role: "system",
			content: buildSystemPromptForPlatform(profile, platform),
		},
		{ role: "user", content: context },
	];
}
