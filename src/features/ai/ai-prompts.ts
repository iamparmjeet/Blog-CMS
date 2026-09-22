import { z } from "zod";

export const DEFAULT_MODEL = "z-ai/glm-5.3-flash";
export const MAX_GENERATE_PROMPT_LENGTH = 4000;
export const MAX_WRITING_SAMPLE_LENGTH = 4000;

export interface GenerationProfile {
	defaultModel: string;
	writingStyle: string;
	writingSample: string;
}

export const generateInputSchema = z.object({
	prompt: z.string().trim().min(1).max(MAX_GENERATE_PROMPT_LENGTH),
	postId: z.number().int().positive().optional(),
	model: z.string().trim().min(1).max(120).optional(),
});

export type GenerateInput = z.infer<typeof generateInputSchema>;

export interface ChatMessage {
	role: "system" | "user";
	content: string;
}

export function resolveModel(
	profile: GenerationProfile,
	override?: string,
): string {
	return override?.trim() || profile.defaultModel.trim() || DEFAULT_MODEL;
}

export function buildSystemPrompt(profile: GenerationProfile): string {
	const parts = [
		"You are a drafting assistant for a single-owner blog. Produce draft body text only: no front matter, no publication, no status changes.",
	];

	const style = profile.writingStyle.trim();

	if (style) {
		parts.push(`Writing style to match:\n${style}`);
	}

	const sample = profile.writingSample.trim();

	if (sample) {
		parts.push(
			`Writing sample for voice reference:\n${sample.slice(0, MAX_WRITING_SAMPLE_LENGTH)}`,
		);
	}

	parts.push(
		"Rules: stay on the owner's request, keep the draft editable and neutral in tone unless the style says otherwise, and never claim the draft is published.",
	);

	return parts.join("\n\n");
}

export function buildChatMessages({
	profile,
	prompt,
	postContext,
}: {
	profile: GenerationProfile;
	prompt: string;
	postContext?: { title: string };
}): ChatMessage[] {
	const trimmedTitle = postContext?.title.trim();
	const userContent =
		trimmedTitle && trimmedTitle.toLowerCase() !== "untitled"
			? `Post title: ${trimmedTitle}\n\nRequest: ${prompt}`
			: prompt;

	return [
		{ role: "system", content: buildSystemPrompt(profile) },
		{ role: "user", content: userContent },
	];
}
