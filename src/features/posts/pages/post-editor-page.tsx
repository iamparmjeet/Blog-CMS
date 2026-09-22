import {
	IconArrowLeft,
	IconBold,
	IconCheck,
	IconCode,
	IconH2,
	IconItalic,
	IconList,
	IconListNumbers,
	IconPhoto,
	IconQuote,
	IconSparkles,
	IconTrash,
	IconX,
} from "@tabler/icons-react";
import { Link, useRouter } from "@tanstack/react-router";
import Placeholder from "@tiptap/extension-placeholder";
import { type Editor, EditorContent, useEditor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import {
	type ReactNode,
	useDeferredValue,
	useEffect,
	useEffectEvent,
	useRef,
	useState,
} from "react";
import { useSetSidebarPost } from "#/components/content-os/sidebar-context";
import { SegmentedControl } from "#/components/content-os/ui";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Textarea } from "#/components/ui/textarea";
import { GenerateDialog } from "#/features/ai/components/generate-dialog";
import { MediaPicker } from "#/features/media/components/media-picker";
import type { MediaItem } from "#/features/media/media.types";
import { cn } from "#/lib/utils";
import { MediaAsset } from "../editor/media-asset";
import {
	countWords,
	parseIncomingPostBody,
	serializePostBody,
} from "../functions/post-body";
import { applyPostLifecycle } from "../functions/post-lifecycle.function";
import {
	getPostMetadataValidationError,
	type PostMetadata,
} from "../functions/post-metadata";
import type { PostEditorData } from "../functions/posts.types";
import { savePostBody } from "../functions/save-post-body.function";
import { savePostMetadata } from "../functions/save-post-metadata.function";

const AUTOSAVE_DELAY_MS = 700;

type SaveStatus = "saved" | "saving" | "local" | "error";
type EditorView = "write" | "seo";
type RepurposePlatform = "twitter" | "linkedin" | "instagram" | "reels";

const REPURPOSE_PLATFORMS: readonly {
	label: string;
	value: RepurposePlatform;
}[] = [
	{ label: "X / Twitter", value: "twitter" },
	{ label: "LinkedIn", value: "linkedin" },
	{ label: "Instagram", value: "instagram" },
	{ label: "Reels", value: "reels" },
];

const REPURPOSE_PROMPTS: Record<RepurposePlatform, string> = {
	instagram: "an Instagram caption",
	linkedin: "a LinkedIn post",
	reels: "a Reels script",
	twitter: "a Twitter thread",
};

interface PostEditorPageProps {
	post: PostEditorData;
}

export function PostEditorPage({ post }: PostEditorPageProps) {
	const storageKey = `contentos:post:${post.id}:body`;
	const bodySaveTimeoutRef = useRef<number | null>(null);
	const metadataSaveTimeoutRef = useRef<number | null>(null);
	const isSavingRef = useRef(false);
	const isSavingMetadataRef = useRef(false);
	const shouldSelectInitialTitleRef = useRef(
		post.title === "Untitled" && post.wordCount === 0,
	);
	const latestBodyRef = useRef(serializePostBody(post.body));
	const latestMetadataRef = useRef<PostMetadata>({
		title: post.title,
		slug: post.slug,
		seoTitle: post.seoTitle,
		description: post.description,
	});
	const [bodySaveStatus, setBodySaveStatus] = useState<SaveStatus>("saved");
	const [metadataSaveStatus, setMetadataSaveStatus] =
		useState<SaveStatus>("saved");
	const [metadata, setMetadata] = useState(latestMetadataRef.current);
	const [metadataError, setMetadataError] = useState<string | null>(null);
	const [view, setView] = useState<EditorView>("write");
	const [previewBody, setPreviewBody] = useState(latestBodyRef.current);
	const deferredPreviewBody = useDeferredValue(previewBody);
	const [wordCount, setWordCount] = useState(post.wordCount);
	const router = useRouter();
	const [isPreviewOpen, setIsPreviewOpen] = useState(false);
	const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
	const [isRepurposeOpen, setIsRepurposeOpen] = useState(true);
	const [isGenerateOpen, setIsGenerateOpen] = useState(false);
	const [isPublished, setIsPublished] = useState(post.status === "published");
	const [isPublishing, setIsPublishing] = useState(false);
	const [publishError, setPublishError] = useState<string | null>(null);
	const setSidebarPost = useSetSidebarPost();

	const handleSidebarPublishChange = useEffectEvent((next: boolean) => {
		void togglePublish(next);
	});

	useEffect(() => {
		setSidebarPost({
			isPublished,
			onPublishChange: handleSidebarPublishChange,
			slug: metadata.slug,
			title: metadata.title,
			updatedAt: "just now",
			wordCount,
		});

		return () => setSidebarPost(null);
	}, [isPublished, metadata.slug, metadata.title, setSidebarPost, wordCount]);

	const saveLatestBody = useEffectEvent(async () => {
		if (isSavingRef.current) {
			return;
		}

		const body = latestBodyRef.current;
		isSavingRef.current = true;

		setBodySaveStatus("saving");

		try {
			const result = await savePostBody({
				data: {
					postId: post.id,
					body,
				},
			});

			setWordCount(result.wordCount);

			if (latestBodyRef.current === body) {
				window.localStorage.removeItem(storageKey);
				setBodySaveStatus("saved");
			}
		} catch {
			setBodySaveStatus("error");
		} finally {
			isSavingRef.current = false;

			if (latestBodyRef.current !== body) {
				queueSave();
			}
		}
	});

	const queueSave = useEffectEvent(() => {
		if (bodySaveTimeoutRef.current !== null) {
			window.clearTimeout(bodySaveTimeoutRef.current);
		}

		bodySaveTimeoutRef.current = window.setTimeout(() => {
			bodySaveTimeoutRef.current = null;
			void saveLatestBody();
		}, AUTOSAVE_DELAY_MS);
	});

	const saveLatestMetadata = useEffectEvent(async () => {
		if (isSavingMetadataRef.current) {
			return;
		}

		const nextMetadata = latestMetadataRef.current;
		const validationError = getPostMetadataValidationError(nextMetadata);

		if (validationError) {
			setMetadataError(validationError);
			setMetadataSaveStatus("error");
			return;
		}

		isSavingMetadataRef.current = true;
		setMetadataSaveStatus("saving");

		try {
			await savePostMetadata({
				data: { postId: post.id, ...nextMetadata },
			});

			if (isSameMetadata(latestMetadataRef.current, nextMetadata)) {
				setMetadataSaveStatus("saved");
			}
		} catch (error) {
			setMetadataError(
				error instanceof Error ? error.message : "Could not save metadata",
			);
			setMetadataSaveStatus("error");
		} finally {
			isSavingMetadataRef.current = false;

			if (!isSameMetadata(latestMetadataRef.current, nextMetadata)) {
				queueMetadataSave();
			}
		}
	});

	const queueMetadataSave = useEffectEvent(() => {
		if (metadataSaveTimeoutRef.current !== null) {
			window.clearTimeout(metadataSaveTimeoutRef.current);
		}

		metadataSaveTimeoutRef.current = window.setTimeout(() => {
			metadataSaveTimeoutRef.current = null;
			void saveLatestMetadata();
		}, AUTOSAVE_DELAY_MS);
	});

	const editor = useEditor({
		extensions: [
			StarterKit,
			Placeholder.configure({
				placeholder: "Start writing your draft...",
			}),
			MediaAsset,
		],
		content: post.body,
		immediatelyRender: false,
		editorProps: {
			attributes: {
				class:
					"prose prose-zinc max-w-none focus:outline-none dark:prose-invert",
			},
		},
		onUpdate: ({ editor: updatedEditor }) => {
			const document = parseIncomingPostBody(
				JSON.stringify(updatedEditor.getJSON()),
			);
			const body = serializePostBody(document);

			latestBodyRef.current = body;
			setPreviewBody(body);
			setWordCount(countWords(document));

			try {
				window.localStorage.setItem(storageKey, body);
				setBodySaveStatus("local");
			} catch {
				// Server autosave remains available when browser storage is unavailable.
			}
			queueSave();
		},
	});

	useEffect(() => {
		if (!editor) {
			return;
		}

		const recoveredBody = window.localStorage.getItem(storageKey);

		if (!recoveredBody || recoveredBody === latestBodyRef.current) {
			return;
		}

		try {
			const document = parseIncomingPostBody(recoveredBody);

			latestBodyRef.current = serializePostBody(document);
			setPreviewBody(latestBodyRef.current);
			editor.commands.setContent(document, { emitUpdate: false });
			setWordCount(countWords(document));
			setBodySaveStatus("local");
			queueSave();
		} catch {
			window.localStorage.removeItem(storageKey);
		}
	}, [editor, storageKey]);

	useEffect(() => {
		return () => {
			if (bodySaveTimeoutRef.current !== null) {
				window.clearTimeout(bodySaveTimeoutRef.current);
			}
			if (metadataSaveTimeoutRef.current !== null) {
				window.clearTimeout(metadataSaveTimeoutRef.current);
			}
		};
	}, []);

	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			const modifier = event.metaKey || event.ctrlKey;

			if (modifier && event.shiftKey && event.key.toLowerCase() === "v") {
				event.preventDefault();
				setIsPreviewOpen((open) => !open);
			}
		}

		window.addEventListener("keydown", handleKeyDown);

		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	function insertGeneratedText(text: string) {
		if (!editor) {
			return;
		}

		const blocks = text
			.split(/\n\s*\n/)
			.map((paragraph) => paragraph.trim())
			.filter((paragraph) => paragraph.length > 0)
			.map((paragraph) => ({
				type: "paragraph",
				content: [{ type: "text", text: paragraph }],
			}));

		if (blocks.length === 0) {
			return;
		}

		editor.chain().focus().insertContent(blocks).run();
		setIsGenerateOpen(false);
	}

	async function togglePublish(nextPublished: boolean) {
		if (isPublishing || nextPublished === isPublished) {
			return;
		}

		setIsPublishing(true);
		setPublishError(null);

		try {
			await applyPostLifecycle({
				data: {
					action: nextPublished ? "publish" : "unpublish",
					postIds: [post.id],
				},
			});
			setIsPublished(nextPublished);
			await router.invalidate();
		} catch (error) {
			setPublishError(
				error instanceof Error
					? error.message
					: "Could not update the post status",
			);
		} finally {
			setIsPublishing(false);
		}
	}

	async function moveToTrash() {
		if (!window.confirm("Move this post to trash?")) {
			return;
		}

		try {
			await applyPostLifecycle({
				data: { action: "trash", postIds: [post.id] },
			});
			await router.navigate({ to: "/posts" });
		} catch (error) {
			setPublishError(
				error instanceof Error ? error.message : "Could not delete the post",
			);
		}
	}

	function updateMetadata<Key extends keyof PostMetadata>(
		key: Key,
		value: PostMetadata[Key],
	) {
		const nextMetadata = { ...latestMetadataRef.current, [key]: value };

		latestMetadataRef.current = nextMetadata;
		setMetadata(nextMetadata);

		const validationError = getPostMetadataValidationError(nextMetadata);
		setMetadataError(validationError);

		if (validationError) {
			setMetadataSaveStatus("error");
			return;
		}

		setMetadataSaveStatus("local");
		queueMetadataSave();
	}

	return (
		<main className="flex h-full min-h-0 flex-col bg-app-bg">
			<header className="flex h-12 shrink-0 items-center justify-between gap-4 border-border border-b bg-sidebar-bg px-4 sm:px-6">
				<div className="flex min-w-0 items-center gap-2 text-xs">
					<Link
						className="inline-flex min-h-7 shrink-0 items-center gap-1.5 rounded px-1 text-text-muted transition-colors hover:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						to="/posts"
					>
						<IconArrowLeft aria-hidden="true" className="size-3.5" />
						Posts
					</Link>
					<span aria-hidden="true" className="text-text-faint">
						/
					</span>
					<span className="truncate text-text-dim">
						{metadata.title || "Untitled"}
					</span>
				</div>

				<div className="flex min-w-0 items-center gap-2">
					<EditorSaveStatus
						bodyStatus={bodySaveStatus}
						metadataError={metadataError}
						metadataStatus={metadataSaveStatus}
					/>

					<SegmentedControl
						ariaLabel="Editor view"
						className="hidden sm:inline-flex"
						onChange={setView}
						options={[
							{ label: "Write", value: "write" },
							{ label: "SEO", value: "seo" },
						]}
						value={view}
					/>

					{isRepurposeOpen ? null : (
						<Button
							className="hidden xl:inline-flex"
							onClick={() => setIsRepurposeOpen(true)}
							size="default"
							type="button"
							variant="ghost"
						>
							<IconSparkles aria-hidden="true" className="text-brand" />
							Repurpose
						</Button>
					)}

					<Button
						onClick={() => setIsGenerateOpen(true)}
						size="default"
						type="button"
						variant="ghost"
					>
						<IconSparkles aria-hidden="true" className="text-brand" />
						Generate
					</Button>

					<Button
						onClick={() => setIsMediaPickerOpen(true)}
						size="default"
						type="button"
						variant="ghost"
					>
						<IconPhoto aria-hidden="true" className="text-brand" />
						Media
					</Button>

					<Button
						onClick={() => setIsPreviewOpen(true)}
						size="default"
						type="button"
						variant="outline"
					>
						Preview
					</Button>
				</div>
			</header>

			<div className="border-border border-b px-4 py-2 sm:hidden">
				<SegmentedControl
					ariaLabel="Editor view"
					onChange={setView}
					options={[
						{ label: "Write", value: "write" },
						{ label: "SEO", value: "seo" },
					]}
					value={view}
				/>
			</div>

			{publishError ? (
				<p
					className="shrink-0 border-border-subtle border-b bg-danger/5 px-4 py-2 text-danger text-xs"
					role="alert"
				>
					{publishError}
				</p>
			) : null}

			<div
				className={cn(
					"grid min-h-0 flex-1",
					isRepurposeOpen &&
						"xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_384px]",
				)}
			>
				<div className="min-h-0 overflow-y-auto">
					{view === "write" ? (
						<section className="group relative mx-auto w-full max-w-[808px] px-5 py-10 sm:px-8 sm:py-16">
							<Input
								aria-label="Post title"
								autoFocus={shouldSelectInitialTitleRef.current}
								className="h-auto border-0 bg-transparent px-0 py-1 font-semibold text-[32px]/tight tracking-[-0.035em] placeholder:text-text-ghost focus-visible:border-0 focus-visible:ring-0 md:text-[36px]/tight dark:bg-transparent"
								onFocus={(event) => {
									if (shouldSelectInitialTitleRef.current) {
										event.currentTarget.select();
										shouldSelectInitialTitleRef.current = false;
									}
								}}
								onChange={(event) =>
									updateMetadata("title", event.target.value)
								}
								placeholder="Untitled"
								value={metadata.title}
							/>
							<div className="mt-2 flex items-center gap-1 text-[13px] text-text-dim">
								<span aria-hidden="true">/</span>
								<Input
									aria-describedby="slug-help"
									aria-invalid={
										metadataError?.toLowerCase().includes("slug")
											? true
											: undefined
									}
									aria-label="Post slug"
									className="h-auto max-w-md border-0 bg-transparent px-0 py-0 font-mono text-[13px] focus-visible:border-0 focus-visible:ring-0 md:text-[13px] dark:bg-transparent"
									onChange={(event) =>
										updateMetadata("slug", event.target.value)
									}
									value={metadata.slug}
								/>
							</div>
							<p className="sr-only" id="slug-help">
								The URL stays stable when you change the title.
							</p>
							<Button
								aria-label="Move to trash"
								className="absolute top-14 right-5 text-text-dim opacity-0 transition-opacity hover:text-danger focus-visible:opacity-100 group-hover:opacity-100 max-sm:opacity-100 sm:right-8"
								onClick={() => void moveToTrash()}
								size="icon-sm"
								title="Move to trash"
								type="button"
								variant="ghost"
							>
								<IconTrash aria-hidden="true" />
							</Button>

							<div className="mt-8 border-border border-t pt-9">
								<BubbleEditorToolbar editor={editor} />
								<EditorContent editor={editor} />
							</div>
						</section>
					) : null}

					{view === "seo" ? (
						<MetadataPanel
							error={metadataError}
							metadata={metadata}
							onChange={updateMetadata}
						/>
					) : null}
				</div>

				{isRepurposeOpen ? (
					<RepurposeRail onClose={() => setIsRepurposeOpen(false)} />
				) : null}
			</div>

			{isPreviewOpen ? (
				<PostPreviewOverlay
					body={deferredPreviewBody}
					isPublished={isPublished}
					metadata={metadata}
					onClose={() => setIsPreviewOpen(false)}
				/>
			) : null}

			{isGenerateOpen ? (
				<GenerateDialog
					postId={post.id}
					onClose={() => setIsGenerateOpen(false)}
					onInsert={insertGeneratedText}
				/>
			) : null}

			{isMediaPickerOpen && editor ? (
				<MediaPicker
					onClose={() => setIsMediaPickerOpen(false)}
					onSelect={(item: MediaItem) => {
						editor
							.chain()
							.focus()
							.insertMediaAsset({
								alt: item.name,
								kind: item.kind,
								mediaId: item.id,
								poster: item.previewUrl ?? null,
								src: item.url,
								title: item.name,
							})
							.run();
						setIsMediaPickerOpen(false);
					}}
				/>
			) : null}
		</main>
	);
}

function MetadataPanel({
	metadata,
	error,
	onChange,
}: {
	metadata: PostMetadata;
	error: string | null;
	onChange: <Key extends keyof PostMetadata>(
		key: Key,
		value: PostMetadata[Key],
	) => void;
}) {
	return (
		<section className="mx-auto w-full max-w-2xl px-4 py-7 sm:px-8 sm:py-10">
			<h1 className="font-semibold text-[24px] text-text-primary tracking-[-0.03em]">
				SEO &amp; meta
			</h1>
			<p className="mt-1.5 text-text-muted text-xs">
				Controls how this post appears in search results and link previews.
			</p>

			<div className="mt-8 flex flex-col gap-6">
				<MetadataField
					counter={{
						limit: 60,
						value: metadata.seoTitle.length,
						warnAt: 45,
					}}
					hint="Defaults to the post title. Keep under 60 characters."
					htmlFor="seo-title"
					label="SEO title"
				>
					<Input
						id="seo-title"
						maxLength={200}
						onChange={(event) => onChange("seoTitle", event.target.value)}
						placeholder={metadata.title}
						value={metadata.seoTitle}
					/>
				</MetadataField>

				<MetadataField
					counter={{
						limit: 160,
						value: metadata.description.length,
						warnAt: 140,
					}}
					hint="Used in search results and link previews. Keep under 160 characters."
					htmlFor="seo-description"
					label="Meta description"
				>
					<Textarea
						id="seo-description"
						maxLength={320}
						onChange={(event) => onChange("description", event.target.value)}
						placeholder="Describe this post for search results…"
						value={metadata.description}
					/>
				</MetadataField>

				<MetadataField
					hint="The URL stays stable after the post is published."
					htmlFor="seo-slug"
					label="Slug"
				>
					<Input
						aria-invalid={
							error?.toLowerCase().includes("slug") ? true : undefined
						}
						id="seo-slug"
						maxLength={80}
						onChange={(event) => onChange("slug", event.target.value)}
						value={metadata.slug}
					/>
				</MetadataField>
			</div>

			<div className="mt-8 rounded-xl border border-border bg-flat-surface p-4 sm:p-5">
				<p className="font-medium text-[10px] text-text-dim uppercase tracking-[0.07em]">
					Search preview
				</p>
				<p className="mt-2.5 text-[#4285f4] text-[15px]">
					{metadata.seoTitle || metadata.title || "Untitled post"}
				</p>
				<p className="mt-0.5 font-mono text-[11px] text-success">
					your-domain.com › {metadata.slug}
				</p>
				<p className="mt-1 text-[#9aa0a6] text-xs leading-relaxed">
					{metadata.description ||
						"No meta description set. Add one above to control how this post appears in search results."}
				</p>
			</div>

			{error ? (
				<p className="mt-5 text-danger text-sm" role="alert">
					{error}
				</p>
			) : null}
		</section>
	);
}

function MetadataField({
	children,
	counter,
	hint,
	htmlFor,
	label,
}: {
	children: ReactNode;
	counter?: { limit: number; value: number; warnAt: number };
	hint?: string;
	htmlFor: string;
	label: string;
}) {
	return (
		<div className="flex flex-col gap-1.5">
			<div className="flex items-center justify-between gap-3">
				<label
					className="font-medium text-text-secondary text-xs"
					htmlFor={htmlFor}
				>
					{label}
				</label>
				{counter ? (
					<span
						className={cn(
							"font-mono text-[11px] tabular-nums",
							counter.value > counter.limit
								? "text-danger"
								: counter.value > counter.warnAt
									? "text-warning"
									: "text-text-muted",
						)}
					>
						{counter.value}/{counter.limit}
					</span>
				) : null}
			</div>
			{children}
			{hint ? (
				<span className="text-[11px] text-text-muted">{hint}</span>
			) : null}
		</div>
	);
}

function PostPreviewOverlay({
	body,
	isPublished,
	metadata,
	onClose,
}: {
	body: string;
	isPublished: boolean;
	metadata: PostMetadata;
	onClose: () => void;
}) {
	const previewEditor = useEditor({
		extensions: [StarterKit, MediaAsset],
		content: parseIncomingPostBody(body),
		editable: false,
		immediatelyRender: false,
		editorProps: {
			attributes: {
				class: "max-w-none focus:outline-none",
			},
		},
	});

	useEffect(() => {
		if (!previewEditor) {
			return;
		}

		previewEditor.commands.setContent(parseIncomingPostBody(body), {
			emitUpdate: false,
		});
	}, [body, previewEditor]);

	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") {
				onClose();
			}
		}

		window.addEventListener("keydown", handleKeyDown);

		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [onClose]);

	if (!previewEditor) {
		return null;
	}

	return (
		<div className="fixed inset-0 z-[8000] overflow-y-auto bg-[#fafafa] text-[#1a1a1a]">
			<div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-[#e5e5e5] border-b bg-[#fafafa]/95 px-4 py-2.5 backdrop-blur sm:px-5">
				<button
					className="inline-flex items-center gap-1.5 text-[#525252] text-xs transition-colors hover:text-[#111] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
					onClick={onClose}
					type="button"
				>
					<IconArrowLeft aria-hidden="true" className="size-3.5" />
					Exit preview
				</button>

				<span className="hidden rounded-full border border-[#e0e0e0] bg-white px-3 py-1 font-mono text-[#525252] text-[11px] sm:inline-flex">
					your-domain.com/{metadata.slug}
				</span>

				<span className="text-[#737373] text-[11px]">
					{isPublished ? "Published" : "Preview — not published"}
				</span>
			</div>

			<article className="mx-auto max-w-[680px] px-5 py-8 sm:px-6 sm:py-12">
				<h1 className="font-semibold text-[#111] text-[32px] leading-[1.2] tracking-[-0.03em] sm:text-[36px]">
					{metadata.title || "Untitled"}
				</h1>
				{metadata.description ? (
					<p className="mt-4 text-[#525252] text-[18px] leading-relaxed">
						{metadata.description}
					</p>
				) : null}

				<div className="preview-body mt-8 text-[17px] leading-[1.8]">
					<EditorContent editor={previewEditor} />
				</div>
			</article>
		</div>
	);
}

function RepurposeRail({ onClose }: { onClose: () => void }) {
	const [platform, setPlatform] = useState<RepurposePlatform>("twitter");

	return (
		<aside className="hidden min-h-0 flex-col border-border border-l bg-sidebar-bg xl:flex">
			<div className="flex h-12 shrink-0 items-center justify-between border-border border-b px-4">
				<div className="flex items-center gap-2">
					<IconSparkles aria-hidden="true" className="size-4 text-brand" />
					<h2 className="font-semibold text-sm text-text-body">Repurpose</h2>
				</div>
				<Button
					aria-label="Close repurpose panel"
					className="text-text-dim hover:text-text-secondary"
					onClick={onClose}
					size="icon-sm"
					type="button"
					variant="ghost"
				>
					<IconX aria-hidden="true" />
				</Button>
			</div>

			<div
				aria-label="Repurpose platform"
				className="flex shrink-0 items-center justify-between gap-1 overflow-x-auto border-border border-b px-4 py-2"
				role="tablist"
			>
				{REPURPOSE_PLATFORMS.map((option) => {
					const isActive = option.value === platform;

					return (
						<button
							aria-selected={isActive}
							className={cn(
								"shrink-0 rounded-md px-3 py-1.5 font-medium text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
								isActive
									? "bg-brand/15 text-accent-soft"
									: "text-text-dim hover:text-text-secondary",
							)}
							key={option.value}
							onClick={() => setPlatform(option.value)}
							role="tab"
							type="button"
						>
							{option.label}
						</button>
					);
				})}
			</div>

			<div className="shrink-0 border-border border-b p-4">
				<div className="flex items-center gap-3">
					<label
						className="font-mono text-[10px] text-text-dim"
						htmlFor="repurpose-model"
					>
						openrouter
					</label>
					<select
						aria-describedby="repurpose-unavailable"
						className="h-8 min-w-0 flex-1 rounded-md border border-border bg-app-bg px-2 text-text-muted text-xs outline-none"
						disabled
						id="repurpose-model"
						title="AI repurposing is planned for Phase 5"
					>
						<option>Claude Haiku 3.5 - fast</option>
					</select>
				</div>

				<Button
					aria-describedby="repurpose-unavailable"
					className="mt-4 h-10 w-full disabled:opacity-100"
					disabled
					title="AI repurposing is planned for Phase 5"
					type="button"
					variant="brand"
				>
					<IconSparkles aria-hidden="true" />
					Generate
				</Button>
			</div>

			<div className="flex min-h-0 flex-1 flex-col items-center justify-center px-8 pb-20 text-center">
				<IconSparkles aria-hidden="true" className="size-6 text-text-faint" />
				<p className="mt-5 text-text-dim text-xs">
					Generate {REPURPOSE_PROMPTS[platform]} from this post
				</p>
				<p className="sr-only" id="repurpose-unavailable">
					AI repurposing is planned for Phase 5.
				</p>
			</div>
		</aside>
	);
}

function BubbleEditorToolbar({ editor }: { editor: Editor | null }) {
	if (!editor) {
		return null;
	}

	return (
		<BubbleMenu
			className="flex items-center gap-0.5 rounded-lg border border-border bg-popover p-1 shadow-xl"
			editor={editor}
			options={{ placement: "top" }}
		>
			<div
				aria-label="Editor formatting"
				className="flex gap-0.5"
				role="toolbar"
			>
				<EditorToolbarButton
					active={editor.isActive("bold")}
					icon={<IconBold aria-hidden="true" />}
					label="Bold"
					onClick={() => editor.chain().focus().toggleBold().run()}
				/>
				<EditorToolbarButton
					active={editor.isActive("italic")}
					icon={<IconItalic aria-hidden="true" />}
					label="Italic"
					onClick={() => editor.chain().focus().toggleItalic().run()}
				/>
				<EditorToolbarButton
					active={editor.isActive("heading", { level: 2 })}
					icon={<IconH2 aria-hidden="true" />}
					label="Heading"
					onClick={() =>
						editor.chain().focus().toggleHeading({ level: 2 }).run()
					}
				/>
				<EditorToolbarButton
					active={editor.isActive("bulletList")}
					icon={<IconList aria-hidden="true" />}
					label="Bullets"
					onClick={() => editor.chain().focus().toggleBulletList().run()}
				/>
				<EditorToolbarButton
					active={editor.isActive("orderedList")}
					icon={<IconListNumbers aria-hidden="true" />}
					label="Numbered list"
					onClick={() => editor.chain().focus().toggleOrderedList().run()}
				/>
				<EditorToolbarButton
					active={editor.isActive("blockquote")}
					icon={<IconQuote aria-hidden="true" />}
					label="Quote"
					onClick={() => editor.chain().focus().toggleBlockquote().run()}
				/>
				<EditorToolbarButton
					active={editor.isActive("codeBlock")}
					icon={<IconCode aria-hidden="true" />}
					label="Code block"
					onClick={() => editor.chain().focus().toggleCodeBlock().run()}
				/>
			</div>
		</BubbleMenu>
	);
}

function EditorToolbarButton({
	active,
	icon,
	label,
	onClick,
}: {
	active: boolean;
	icon: ReactNode;
	label: string;
	onClick: () => void;
}) {
	return (
		<Button
			aria-label={label}
			aria-pressed={active}
			size="icon"
			title={label}
			type="button"
			variant={active ? "secondary" : "ghost"}
			onClick={onClick}
		>
			{icon}
		</Button>
	);
}

function EditorSaveStatus({
	bodyStatus,
	metadataStatus,
	metadataError,
}: {
	bodyStatus: SaveStatus;
	metadataStatus: SaveStatus;
	metadataError: string | null;
}) {
	const label = getSaveStatusLabel(bodyStatus, metadataStatus, metadataError);
	const hasError =
		Boolean(metadataError) ||
		bodyStatus === "error" ||
		metadataStatus === "error";

	return (
		<p
			aria-live="polite"
			className={cn(
				"hidden max-w-32 items-center gap-1 truncate text-xs tabular-nums sm:flex sm:max-w-none",
				hasError
					? "text-danger"
					: label === "Saved"
						? "text-success"
						: "text-text-muted",
			)}
		>
			{label === "Saved" ? (
				<IconCheck aria-hidden="true" className="size-3.5" />
			) : null}
			{label}
		</p>
	);
}

function getSaveStatusLabel(
	bodyStatus: SaveStatus,
	metadataStatus: SaveStatus,
	metadataError: string | null,
): string {
	if (metadataError) {
		return "Metadata needs attention";
	}
	if (bodyStatus === "error" || metadataStatus === "error") {
		return "Could not save";
	}
	if (bodyStatus === "saving" || metadataStatus === "saving") {
		return "Saving...";
	}
	if (bodyStatus === "local" || metadataStatus === "local") {
		return "Unsaved changes";
	}
	return "Saved";
}

function isSameMetadata(left: PostMetadata, right: PostMetadata): boolean {
	return (
		left.title === right.title &&
		left.slug === right.slug &&
		left.seoTitle === right.seoTitle &&
		left.description === right.description
	);
}
