import { IconSparkles, IconX } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "#/components/ui/button";
import { Textarea } from "#/components/ui/textarea";
import { createSseParser } from "../ai-stream";

type Phase = "idle" | "streaming" | "done" | "error";

const MAX_PROMPT_LENGTH = 4000;

function describeError(code: string, fallback: string): string {
	if (code === "not_configured") {
		return "AI generation is not configured yet. Set OPENROUTER_API_KEY on the server, pick a model under Settings → Account, then retry. Your draft is unchanged.";
	}

	return fallback;
}

export function GenerateDialog({
	postId,
	onClose,
	onInsert,
}: {
	postId: number;
	onClose: () => void;
	onInsert: (text: string) => void;
}) {
	const [prompt, setPrompt] = useState("");
	const [phase, setPhase] = useState<Phase>("idle");
	const [output, setOutput] = useState("");
	const [model, setModel] = useState<string | null>(null);
	const [error, setError] = useState<{ code: string; message: string } | null>(
		null,
	);
	const abortRef = useRef<AbortController | null>(null);

	useEffect(() => {
		return () => {
			abortRef.current?.abort();
		};
	}, []);

	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") {
				onClose();
			}
		}

		window.addEventListener("keydown", handleKeyDown);

		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [onClose]);

	async function startGeneration() {
		const trimmed = prompt.trim();

		if (!trimmed || phase === "streaming") {
			return;
		}

		abortRef.current?.abort();

		const controller = new AbortController();
		abortRef.current = controller;

		setPhase("streaming");
		setOutput("");
		setModel(null);
		setError(null);

		let response: Response;

		try {
			response = await fetch("/api/ai/generate", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ prompt: trimmed, postId }),
				signal: controller.signal,
			});
		} catch (requestError) {
			if (controller.signal.aborted) {
				setPhase("idle");
				return;
			}

			setPhase("error");
			setError({
				code: "network_error",
				message:
					requestError instanceof Error
						? requestError.message
						: "Could not reach the server.",
			});
			return;
		}

		if (!response.ok || !response.body) {
			let code = "provider_error";
			let message = `Generation failed (HTTP ${response.status}). Your draft is unchanged.`;

			try {
				const payload = (await response.json()) as {
					error?: { code?: string; message?: string };
				};

				if (payload.error?.code) {
					code = payload.error.code;
				}

				if (payload.error?.message) {
					message = payload.error.message;
				}
			} catch {
				// Fall back to the status-based message above.
			}

			setPhase("error");
			setError({ code, message: describeError(code, message) });
			return;
		}

		setModel(response.headers.get("x-ai-model"));

		const parser = createSseParser();
		const reader = response.body.getReader();
		const decoder = new TextDecoder();

		try {
			for (;;) {
				const { done, value } = await reader.read();

				if (done) {
					break;
				}

				parser.feed(decoder.decode(value, { stream: true }));
				parser.flush();
				setOutput(parser.text);

				if (parser.error) {
					setPhase("error");
					setError({
						code: "stream_error",
						message: `The provider stream failed (${parser.error}). Anything shown above was kept for review; your draft is unchanged.`,
					});
					return;
				}

				if (parser.done) {
					break;
				}
			}
		} catch (streamError) {
			if (controller.signal.aborted) {
				setPhase(parser.text ? "done" : "idle");
				setOutput(parser.text);
				return;
			}

			setPhase("error");
			setError({
				code: "stream_error",
				message:
					streamError instanceof Error
						? streamError.message
						: "The stream failed before completing.",
			});
			return;
		} finally {
			reader.releaseLock();
		}

		setOutput(parser.text);
		setPhase(parser.text ? "done" : "idle");
	}

	function cancelGeneration() {
		abortRef.current?.abort();
	}

	const canGenerate = prompt.trim().length > 0 && phase !== "streaming";

	return (
		<div
			aria-modal="true"
			className="fixed inset-0 z-[8000] flex items-center justify-center bg-black/50 p-4"
			role="dialog"
			aria-label="Generate draft text"
		>
			<div className="flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-border bg-app-bg shadow-2xl">
				<div className="flex h-12 shrink-0 items-center justify-between border-border border-b px-4">
					<div className="flex items-center gap-2">
						<IconSparkles aria-hidden="true" className="size-4 text-brand" />
						<h2 className="font-semibold text-sm text-text-body">
							Generate draft
						</h2>
					</div>
					<Button
						aria-label="Close generate panel"
						onClick={onClose}
						size="icon-sm"
						type="button"
						variant="ghost"
					>
						<IconX aria-hidden="true" />
					</Button>
				</div>

				<div className="min-h-0 flex-1 overflow-y-auto p-4">
					<label
						className="font-medium text-text-secondary text-xs"
						htmlFor="generate-prompt"
					>
						What should the draft say?
					</label>
					<Textarea
						id="generate-prompt"
						className="mt-1.5"
						maxLength={MAX_PROMPT_LENGTH}
						onChange={(event) => setPrompt(event.target.value)}
						placeholder="Draft an intro about composting for beginners…"
						rows={3}
						value={prompt}
					/>

					<div className="mt-3 flex items-center gap-2">
						{phase === "streaming" ? (
							<Button
								onClick={cancelGeneration}
								type="button"
								variant="outline"
							>
								Cancel
							</Button>
						) : (
							<Button
								disabled={!canGenerate}
								onClick={() => void startGeneration()}
								type="button"
								variant="brand"
							>
								<IconSparkles aria-hidden="true" />
								Generate
							</Button>
						)}
						{model ? (
							<span className="truncate font-mono text-[11px] text-text-dim">
								{model}
							</span>
						) : null}
						{phase === "streaming" ? (
							<span aria-live="polite" className="text-text-muted text-xs">
								Streaming…
							</span>
						) : null}
					</div>

					{error ? (
						<p
							className="mt-3 rounded-md bg-danger/5 p-3 text-danger text-xs"
							role="alert"
						>
							{error.message}
						</p>
					) : null}

					{output ? (
						<div className="mt-3 rounded-md border border-border bg-flat-surface p-3">
							<p className="font-medium text-[10px] text-text-dim uppercase tracking-[0.07em]">
								Generated text — review before inserting
							</p>
							<p className="mt-2 whitespace-pre-wrap text-sm text-text-body">
								{output}
							</p>
						</div>
					) : null}
				</div>

				<div className="flex shrink-0 items-center justify-end gap-2 border-border border-t px-4 py-3">
					<Button onClick={onClose} type="button" variant="ghost">
						{output ? "Discard" : "Close"}
					</Button>
					<Button
						disabled={!output || phase === "streaming"}
						onClick={() => onInsert(output)}
						type="button"
						variant="brand"
					>
						Insert into editor
					</Button>
				</div>
			</div>
		</div>
	);
}
