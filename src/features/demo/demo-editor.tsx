import {
	IconArrowLeft,
	IconBold,
	IconCheck,
	IconCode,
	IconCopy,
	IconH2,
	IconItalic,
	IconList,
	IconListNumbers,
	IconQuote,
	IconWand,
} from "@tabler/icons-react";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useMemo, useRef, useState } from "react";
import { SectionLabel, SegmentedControl } from "#/components/content-os/ui";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Textarea } from "#/components/ui/textarea";
import {
	PLATFORM_LABELS,
	REPURPOSE_PLATFORMS,
	type RepurposePlatform,
} from "#/features/ai/ai-repurpose";
import type { PostStatus } from "#/features/posts/functions/posts.types";
import {
	slugFollowsTitle,
	slugForTitle,
} from "#/features/posts/functions/posts.utils";
import { cn } from "#/lib/utils";
import { countWordsInHtml, type DemoPost } from "./demo-data";

const STATUS_OPTIONS: readonly {
	label: string;
	value: PostStatus;
}[] = [
	{ label: "Draft", value: "draft" },
	{ label: "Published", value: "published" },
	{ label: "Scheduled", value: "scheduled" },
];

const VIEW_OPTIONS = [
	{ label: "Write", value: "write" },
	{ label: "SEO", value: "seo" },
] as const;

const DEMO_VARIANTS: Record<RepurposePlatform, string> = {
	twitter: `🧵 Thread (1/4)

Publishing once and syndicating everywhere is how a small audience compounds.

The rule that keeps the voice intact ↓

1. Keep the argument, drop the throat-clearing
2. Open with the lesson, not the story
3. Build the caption around one line

Nothing publishes itself.`,
	linkedin: `I used to publish once and hope.

Now I publish once and syndicate everywhere — and the audience compounds.

The rule that keeps the voice intact:

→ Keep the argument, drop the throat-clearing
→ Open with the lesson, not the story
→ Build the caption around one line

The repurpose panel lives next to the editor so the source stays open.`,
	instagram: `One post → five platforms ✨

No copy-paste. The rule: keep the argument, drop the throat-clearing.

#writing #buildinpublic #indiedev`,
	reels: `[HOOK — 0:00]
Publishing once and hoping is a waste.

[BODY — 0:03]
Write the article once. Then keep the argument and drop everything else.

[CTA — 0:18]
Follow for the full workflow.`,
};

interface DemoEditorProps {
	onBack: () => void;
	onChange: (patch: Partial<DemoPost>) => void;
	post: DemoPost;
	takenSlugs: string[];
}

export function DemoEditor({
	onBack,
	onChange,
	post,
	takenSlugs,
}: DemoEditorProps) {
	const [title, setTitle] = useState(post.title);
	const [slug, setSlug] = useState(post.slug);
	const [seoTitle, setSeoTitle] = useState(post.seoTitle);
	const [description, setDescription] = useState(post.description);
	const [status, setStatus] = useState<PostStatus>(post.status);
	const [view, setView] = useState<"write" | "seo">("write");
	const [saveState, setSaveState] = useState<"saved" | "saving">("saved");
	const saveTimerRef = useRef<number | null>(null);
	const takenSlugsSet = useMemo(() => new Set(takenSlugs), [takenSlugs]);
	const followsTitleRef = useRef(
		slugFollowsTitle({
			title: post.title,
			slug: post.slug,
			status: post.status,
			takenSlugs: takenSlugsSet,
		}),
	);

	const editor = useEditor({
		content: post.body,
		editorProps: {
			attributes: {
				class:
					"prose prose-zinc max-w-none focus:outline-none dark:prose-invert",
			},
		},
		extensions: [
			StarterKit,
			Placeholder.configure({
				placeholder: "Start writing your draft...",
			}),
		],
		immediatelyRender: false,
		shouldRerenderOnTransaction: true,
		onUpdate: ({ editor: updatedEditor }) => {
			const html = updatedEditor.getHTML();

			markChanged();
			onChange({ body: html, wordCount: countWordsInHtml(html) });
		},
	});

	const words = editor ? countWordsInHtml(editor.getHTML()) : post.wordCount;
	const activeStates = {
		blockquote: editor?.isActive("blockquote") ?? false,
		bold: editor?.isActive("bold") ?? false,
		bulletList: editor?.isActive("bulletList") ?? false,
		codeBlock: editor?.isActive("codeBlock") ?? false,
		heading: editor?.isActive("heading", { level: 2 }) ?? false,
		italic: editor?.isActive("italic") ?? false,
		orderedList: editor?.isActive("orderedList") ?? false,
	};

	useEffect(
		() => () => {
			if (saveTimerRef.current !== null) {
				window.clearTimeout(saveTimerRef.current);
			}
		},
		[],
	);

	function markChanged() {
		setSaveState("saving");

		if (saveTimerRef.current !== null) {
			window.clearTimeout(saveTimerRef.current);
		}

		saveTimerRef.current = window.setTimeout(() => setSaveState("saved"), 600);
	}

	function handleTitle(next: string) {
		setTitle(next);
		markChanged();

		if (followsTitleRef.current) {
			const nextSlug = slugForTitle(next, takenSlugsSet);

			setSlug(nextSlug);
			onChange({ title: next, slug: nextSlug });
			return;
		}

		onChange({ title: next });
	}

	function handleSlug(next: string) {
		followsTitleRef.current = false;
		setSlug(next);
		markChanged();
		onChange({ slug: next });
	}

	function handleStatus(next: PostStatus) {
		setStatus(next);
		markChanged();
		onChange({ status: next });
	}

	return (
		<div className="flex min-h-full flex-col">
			<header className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-border border-b bg-sidebar-bg px-3 py-2 sm:px-4">
				<button
					className="inline-flex min-h-7 items-center gap-1.5 rounded px-1 text-text-muted text-xs transition-colors hover:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					onClick={onBack}
					type="button"
				>
					<IconArrowLeft aria-hidden="true" className="size-3.5" />
					Posts
				</button>

				<span
					className={cn(
						"inline-flex items-center gap-1 text-[11px]",
						saveState === "saved"
							? "text-emerald-600 dark:text-emerald-400"
							: "text-text-muted",
					)}
				>
					{saveState === "saved" ? (
						<>
							<IconCheck aria-hidden="true" className="size-3" />
							Saved to demo
						</>
					) : (
						"Saving…"
					)}
				</span>

				<span className="text-[11px] text-text-muted tabular-nums">
					{words} words
				</span>

				<div className="ml-auto flex flex-wrap items-center gap-2">
					<SegmentedControl
						ariaLabel="Editor view"
						onChange={setView}
						options={VIEW_OPTIONS}
						value={view}
					/>
					<SegmentedControl
						ariaLabel="Post status"
						onChange={handleStatus}
						options={STATUS_OPTIONS}
						value={status}
					/>
				</div>
			</header>

			<div className="grid min-h-0 flex-1 xl:grid-cols-[minmax(0,1fr)_300px]">
				<div className="min-w-0">
					{view === "write" ? (
						<section className="mx-auto w-full max-w-[760px] px-4 py-6 sm:px-8 sm:py-10">
							<Input
								aria-label="Post title"
								className="h-auto border-0 bg-transparent px-0 py-1 font-semibold text-[28px]/tight tracking-[-0.035em] placeholder:text-text-ghost focus-visible:border-0 focus-visible:ring-0 md:text-[34px]/tight dark:bg-transparent"
								onChange={(event) => handleTitle(event.target.value)}
								placeholder="Untitled"
								value={title}
							/>
							<div className="mt-2 flex items-center gap-1 text-[13px] text-text-dim">
								<span aria-hidden="true">/</span>
								<Input
									aria-label="Post slug"
									className="h-auto max-w-md border-0 bg-transparent px-0 py-0 font-mono text-[13px] focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent"
									onChange={(event) => handleSlug(event.target.value)}
									value={slug}
								/>
							</div>

							<div className="mt-7 border-border border-t pt-6">
								<div
									aria-label="Editor formatting"
									className="mb-5 inline-flex items-center gap-0.5 rounded-lg border border-border bg-flat-surface p-1"
									role="toolbar"
								>
									<ToolButton
										active={activeStates.bold}
										label="Bold"
										onClick={() => editor?.chain().focus().toggleBold().run()}
									>
										<IconBold aria-hidden="true" />
									</ToolButton>
									<ToolButton
										active={activeStates.italic}
										label="Italic"
										onClick={() => editor?.chain().focus().toggleItalic().run()}
									>
										<IconItalic aria-hidden="true" />
									</ToolButton>
									<ToolButton
										active={activeStates.heading}
										label="Heading"
										onClick={() =>
											editor?.chain().focus().toggleHeading({ level: 2 }).run()
										}
									>
										<IconH2 aria-hidden="true" />
									</ToolButton>
									<ToolButton
										active={activeStates.bulletList}
										label="Bullets"
										onClick={() =>
											editor?.chain().focus().toggleBulletList().run()
										}
									>
										<IconList aria-hidden="true" />
									</ToolButton>
									<ToolButton
										active={activeStates.orderedList}
										label="Numbered list"
										onClick={() =>
											editor?.chain().focus().toggleOrderedList().run()
										}
									>
										<IconListNumbers aria-hidden="true" />
									</ToolButton>
									<ToolButton
										active={activeStates.blockquote}
										label="Quote"
										onClick={() =>
											editor?.chain().focus().toggleBlockquote().run()
										}
									>
										<IconQuote aria-hidden="true" />
									</ToolButton>
									<ToolButton
										active={activeStates.codeBlock}
										label="Code block"
										onClick={() =>
											editor?.chain().focus().toggleCodeBlock().run()
										}
									>
										<IconCode aria-hidden="true" />
									</ToolButton>
								</div>

								<EditorContent editor={editor} />
							</div>
						</section>
					) : (
						<section className="mx-auto w-full max-w-[760px] px-4 py-6 sm:px-8 sm:py-10">
							<div className="flex flex-col gap-5">
								<div className="flex flex-col gap-1.5">
									<label
										className="font-medium text-text-body text-xs"
										htmlFor="demo-seo-title"
									>
										SEO title
									</label>
									<Input
										id="demo-seo-title"
										onChange={(event) => {
											setSeoTitle(event.target.value);
											markChanged();
											onChange({ seoTitle: event.target.value });
										}}
										placeholder={title || "Untitled post"}
										value={seoTitle}
									/>
									<span className="text-[11px] text-text-muted">
										Defaults to the post title. Keep under 60 characters.
									</span>
								</div>

								<div className="flex flex-col gap-1.5">
									<label
										className="font-medium text-text-body text-xs"
										htmlFor="demo-seo-slug"
									>
										Slug
									</label>
									<Input
										className="font-mono"
										id="demo-seo-slug"
										onChange={(event) => handleSlug(event.target.value)}
										value={slug}
									/>
									<span className="text-[11px] text-text-muted">
										The URL stays stable once a post is published.
									</span>
								</div>

								<div className="flex flex-col gap-1.5">
									<label
										className="font-medium text-text-body text-xs"
										htmlFor="demo-seo-description"
									>
										Meta description
									</label>
									<Textarea
										className="min-h-20"
										id="demo-seo-description"
										onChange={(event) => {
											setDescription(event.target.value);
											markChanged();
											onChange({ description: event.target.value });
										}}
										placeholder="A one-sentence summary for search results."
										value={description}
									/>
								</div>

								<div className="rounded-lg border border-border bg-flat-surface p-4">
									<SectionLabel>Search preview</SectionLabel>
									<p className="mt-3 text-[11px] text-brand">
										your-domain.com › {slug || "untitled"}
									</p>
									<p className="mt-1 font-medium text-[15px] text-text-primary">
										{seoTitle || title || "Untitled post"}
									</p>
									<p className="mt-1 line-clamp-2 text-text-muted text-xs leading-relaxed">
										{description ||
											"Add a meta description to control how this post appears in search results."}
									</p>
								</div>
							</div>
						</section>
					)}
				</div>

				<aside className="border-border border-t bg-sidebar-bg xl:border-t-0 xl:border-l">
					<DemoRepurpose wordCount={words} />
				</aside>
			</div>
		</div>
	);
}

function ToolButton({
	active,
	children,
	label,
	onClick,
}: {
	active: boolean;
	children: React.ReactNode;
	label: string;
	onClick: () => void;
}) {
	return (
		<Button
			aria-label={label}
			aria-pressed={active}
			onClick={onClick}
			size="icon-sm"
			type="button"
			variant={active ? "brand" : "ghost"}
		>
			{children}
		</Button>
	);
}

function DemoRepurpose({ wordCount }: { wordCount: number }) {
	const [platform, setPlatform] = useState<RepurposePlatform>("twitter");
	const [output, setOutput] = useState("");
	const [isStreaming, setIsStreaming] = useState(false);
	const [copied, setCopied] = useState(false);
	const streamRef = useRef<number | null>(null);

	useEffect(
		() => () => {
			if (streamRef.current !== null) {
				window.clearInterval(streamRef.current);
			}
		},
		[],
	);

	function stopStream() {
		if (streamRef.current !== null) {
			window.clearInterval(streamRef.current);
			streamRef.current = null;
		}

		setIsStreaming(false);
	}

	function generate() {
		if (isStreaming || wordCount === 0) {
			return;
		}

		stopStream();
		setCopied(false);
		setOutput("");
		setIsStreaming(true);

		const full = DEMO_VARIANTS[platform];
		let index = 0;

		streamRef.current = window.setInterval(() => {
			index = Math.min(full.length, index + 3);
			setOutput(full.slice(0, index));

			if (index >= full.length) {
				stopStream();
			}
		}, 16);
	}

	async function copy() {
		await navigator.clipboard.writeText(output);
		setCopied(true);
		window.setTimeout(() => setCopied(false), 1500);
	}

	return (
		<div className="flex h-full flex-col">
			<div className="flex items-center gap-2 border-border border-b px-4 py-3">
				<IconWand aria-hidden="true" className="size-4 text-brand" />
				<span className="font-semibold text-text-primary text-xs">
					Repurpose
				</span>
			</div>

			<div className="flex flex-wrap gap-0.5 border-border border-b p-2">
				{REPURPOSE_PLATFORMS.map((value) => (
					<Button
						key={value}
						onClick={() => {
							stopStream();
							setPlatform(value);
							setOutput("");
						}}
						size="sm"
						type="button"
						variant={value === platform ? "brand" : "outline"}
					>
						{PLATFORM_LABELS[value]}
					</Button>
				))}
			</div>

			<div className="px-3 py-3">
				<Button
					className="h-9 w-full text-xs"
					disabled={isStreaming || wordCount === 0}
					onClick={generate}
					type="button"
					variant="brand"
				>
					<IconWand className="mr-1.5 size-3.5" />
					{isStreaming ? "Generating…" : "Generate"}
				</Button>
			</div>

			<div className="flex-1 px-3 pb-3">
				<div className="min-h-40 rounded-lg border border-border bg-background px-4 py-3.5">
					{output ? (
						<p className="whitespace-pre-wrap text-[11px] text-text-body leading-6">
							{output}
						</p>
					) : (
						<p className="text-[11px] text-text-muted leading-6">
							{wordCount === 0
								? "Write a few words, then generate a platform-native variant."
								: "Pick a platform and generate a variant. Streaming is simulated in the demo."}
						</p>
					)}
					{isStreaming ? (
						<span className="ml-0.5 inline-block h-4 w-[1.5px] animate-pulse bg-brand align-text-bottom motion-reduce:animate-none" />
					) : null}
				</div>

				{output ? (
					<div className="mt-2 flex items-center gap-2">
						<Button
							className="gap-1.5"
							onClick={() => void copy()}
							size="sm"
							type="button"
							variant="outline"
						>
							<IconCopy aria-hidden="true" className="size-3.5" />
							{copied ? "Copied" : "Copy"}
						</Button>
						{isStreaming ? (
							<Button
								onClick={stopStream}
								size="sm"
								type="button"
								variant="ghost"
							>
								Cancel
							</Button>
						) : null}
					</div>
				) : null}
			</div>
		</div>
	);
}
