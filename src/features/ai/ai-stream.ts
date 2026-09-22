export interface ParsedSseStream {
	text: string;
	done: boolean;
	error: string | null;
}

export interface SseParser extends ParsedSseStream {
	deltas: string[];
	feed(chunk: string): void;
	flush(): void;
}

interface OpenRouterDelta {
	choices?: Array<{ delta?: { content?: unknown; role?: string } }>;
	error?: { message?: unknown };
}

function extractPayload(event: string): string | null {
	const lines = event
		.split("\n")
		.filter((line) => line.startsWith("data:"))
		.map((line) => line.slice("data:".length).trim());

	if (lines.length === 0) {
		return null;
	}

	return lines.join("\n");
}

export function createSseParser(): SseParser {
	let buffer = "";
	const deltas: string[] = [];
	const state: ParsedSseStream = { text: "", done: false, error: null };

	function handleEvent(event: string): void {
		const payload = extractPayload(event);

		if (payload === null) {
			return;
		}

		if (payload === "[DONE]") {
			state.done = true;
			return;
		}

		let parsed: OpenRouterDelta;

		try {
			parsed = JSON.parse(payload) as OpenRouterDelta;
		} catch {
			return;
		}

		if (
			parsed.error &&
			typeof parsed.error.message === "string" &&
			state.error === null
		) {
			state.error = parsed.error.message;
			return;
		}

		for (const choice of parsed.choices ?? []) {
			const content = choice.delta?.content;

			if (typeof content === "string" && content.length > 0 && !state.done) {
				deltas.push(content);
				state.text += content;
			}
		}
	}

	function feed(chunk: string): void {
		if (state.done) {
			return;
		}

		buffer += chunk;

		let boundary = buffer.indexOf("\n\n");

		while (boundary !== -1) {
			handleEvent(buffer.slice(0, boundary));
			buffer = buffer.slice(boundary + 2);
			boundary = buffer.indexOf("\n\n");
		}
	}

	function flush(): void {
		if (state.done) {
			buffer = "";
			return;
		}

		if (buffer.trim().length > 0) {
			handleEvent(buffer);
		}

		buffer = "";
	}

	return {
		deltas,
		feed,
		flush,
		get done() {
			return state.done;
		},
		get error() {
			return state.error;
		},
		get text() {
			return state.text;
		},
	};
}

export function parseSseStream(text: string): ParsedSseStream {
	const parser = createSseParser();

	parser.feed(text);
	parser.flush();

	return { text: parser.text, done: parser.done, error: parser.error };
}

export interface ProviderError {
	code: string;
	message: string;
	status: number;
}

export function mapProviderError(status: number, body: string): ProviderError {
	const detail = body.trim().slice(0, 200);

	if (status === 401) {
		return {
			code: "invalid_key",
			message:
				"OpenRouter rejected the API key. Check OPENROUTER_API_KEY and try again.",
			status,
		};
	}

	if (status === 402) {
		return {
			code: "payment_required",
			message: "The OpenRouter account needs credits before it can generate.",
			status,
		};
	}

	if (status === 429) {
		return {
			code: "rate_limited",
			message: "OpenRouter is rate-limiting this instance. Wait and retry.",
			status,
		};
	}

	if (status >= 500) {
		return {
			code: "provider_unavailable",
			message: `OpenRouter is unavailable (HTTP ${status}). The draft is unchanged — retry shortly.`,
			status,
		};
	}

	return {
		code: "provider_error",
		message: detail
			? `OpenRouter returned HTTP ${status}: ${detail}`
			: `OpenRouter returned HTTP ${status}.`,
		status,
	};
}
