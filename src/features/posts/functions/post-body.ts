import type { JSONContent } from "@tiptap/core";

export interface PostBodyDocument extends JSONContent {
	type: "doc";
	content: JSONContent[];
}

const BLOCK_NODES = new Set([
	"blockquote",
	"bulletList",
	"codeBlock",
	"doc",
	"heading",
	"listItem",
	"orderedList",
	"paragraph",
]);

export function createEmptyPostBody(): PostBodyDocument {
	return {
		type: "doc",
		content: [{ type: "paragraph" }],
	};
}

export function parseStoredPostBody(body: string | null): PostBodyDocument {
	if (!body) {
		return createEmptyPostBody();
	}

	try {
		return parsePostBody(JSON.parse(body));
	} catch {
		return legacyTextToPostBody(body);
	}
}

export function parseIncomingPostBody(body: string): PostBodyDocument {
	try {
		return parsePostBody(JSON.parse(body));
	} catch {
		throw new Error("Post body must be valid TipTap JSON");
	}
}

export function serializePostBody(body: PostBodyDocument): string {
	return JSON.stringify(body);
}

export function countWords(body: PostBodyDocument): number {
	const text = extractText(body).trim();

	return text ? text.split(/\s+/u).length : 0;
}

export function extractPlainText(body: PostBodyDocument): string {
	return body.content.map((node) => extractText(node).trim()).join("\n");
}

function parsePostBody(value: unknown): PostBodyDocument {
	if (!isTipTapNode(value) || value.type !== "doc") {
		throw new Error("Post body must be a TipTap document");
	}

	return {
		...value,
		type: "doc",
		content: value.content ?? [],
	};
}

function isTipTapNode(value: unknown): value is JSONContent {
	if (!isRecord(value) || typeof value.type !== "string") {
		return false;
	}

	if ("text" in value && typeof value.text !== "string") {
		return false;
	}

	return (
		!("content" in value) ||
		(Array.isArray(value.content) && value.content.every(isTipTapNode))
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function extractText(node: JSONContent): string {
	if (node.type === "text") {
		return node.text ?? "";
	}

	const separator = BLOCK_NODES.has(node.type ?? "") ? "\n" : "";

	return (node.content ?? []).map(extractText).join(separator);
}

function legacyTextToPostBody(text: string): PostBodyDocument {
	const lines = text.split(/\r?\n/u);

	return {
		type: "doc",
		content: lines.map((line) => ({
			type: "paragraph",
			content: line ? [{ type: "text", text: line }] : [],
		})),
	};
}
