import { IconArrowLeft, IconEye, IconTrash } from "@tabler/icons-react";
import { Link, useRouter } from "@tanstack/react-router";
import Placeholder from "@tiptap/extension-placeholder";
import { type Editor, EditorContent, useEditor } from "@tiptap/react";
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
import { cn } from "#/lib/utils";
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

interface PostEditorPageProps {
	post: PostEditorData;
}

export function PostEditorPage({ post }: PostEditorPageProps) {
	const storageKey = `contentos:post:${post.id}:body`;
	const bodySaveTimeoutRef = useRef<number | null>(null);
	const metadataSaveTimeoutRef = useRef<number | null>(null);
	const isSavingRef = useRef(false);
	const isSavingMetadataRef = useRef(false);
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
		<main className="flex h-full min-h-0 flex-col">
			<header className="flex h-11 shrink-0 items-center justify-between gap-3 border-border border-b px-4">
				<div className="flex min-w-0 items-center gap-2 text-xs">
					<Link
						className="inline-flex shrink-0 items-center gap-1 text-text-muted transition-colors hover:text-text-secondary"
						to="/posts"
					>
						<IconArrowLeft aria-hidden="true" className="size-3.5" />
						Posts
					</Link>
					<span aria-hidden="true" className="text-text-faint">
						/
					</span>
					<span className="truncate text-text-soft">
						{metadata.title || "Untitled"}
					</span>
				</div>

				<div className="flex shrink-0 items-center gap-2">
					<EditorSaveStatus
						bodyStatus={bodySaveStatus}
						metadataError={metadataError}
						metadataStatus={metadataSaveStatus}
						wordCount={wordCount}
					/>

					<SegmentedControl
						onChange={setView}
						options={[
							{ label: "Write", value: "write" },
							{ label: "SEO", value: "seo" },
						]}
						value={view}
					/>

					<SegmentedControl
						onChange={(next) => void togglePublish(next === "published")}
						options={[
							{ label: "Draft", value: "draft" },
							{ label: "Published", value: "published" },
						]}
						value={isPublished ? "published" : "draft"}
					/>

					<Button
						onClick={() => setIsPreviewOpen(true)}
						size="sm"
						type="button"
						variant="outline"
					>
						<IconEye aria-hidden="true" />
						Preview
					</Button>

					<Button
						aria-label="Move to trash"
						onClick={() => void moveToTrash()}
						size="icon-sm"
						type="button"
						variant="ghost"
					>
						<IconTrash aria-hidden="true" className="size-3.5" />
					</Button>
				</div>
			</header>

			{publishError ? (
				<p
					className="shrink-0 border-border-subtle border-b bg-danger/5 px-4 py-2 text-danger text-xs"
					role="alert"
				>
					{publishError}
				</p>
			) : null}

			<div className="min-h-0 flex-1 overflow-y-auto">
				{view === "write" ? (
					<section className="mx-auto w-full max-w-[720px] px-6 py-12">
						<Input
							aria-label="Post title"
							className="h-auto border-0 bg-transparent px-0 py-1 font-semibold text-[30px] tracking-[-0.02em] placeholder:text-text-ghost focus-visible:border-0 focus-visible:ring-0"
							onChange={(event) => updateMetadata("title", event.target.value)}
							placeholder="Untitled"
							value={metadata.title}
						/>
						<div className="mt-2 flex items-center gap-1 text-text-dim text-xs">
							<span aria-hidden="true">/</span>
							<Input
								aria-describedby="slug-help"
								aria-invalid={
									metadataError?.toLowerCase().includes("slug")
										? true
										: undefined
								}
								aria-label="Post slug"
								className="h-auto max-w-md border-0 bg-transparent px-0 py-0 font-mono text-xs focus-visible:border-0 focus-visible:ring-0"
								onChange={(event) => updateMetadata("slug", event.target.value)}
								value={metadata.slug}
							/>
						</div>
						<p className="sr-only" id="slug-help">
							The URL stays stable when you change the title.
						</p>

						<div className="mt-6 border-border border-y">
							<EditorToolbar editor={editor} />
							<div className="min-h-120 py-8">
								<EditorContent editor={editor} />
							</div>
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

			{isPreviewOpen ? (
				<PostPreviewOverlay
					body={deferredPreviewBody}
					isPublished={isPublished}
					metadata={metadata}
					onClose={() => setIsPreviewOpen(false)}
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
		<section className="mx-auto w-full max-w-2xl px-6 py-12">
			<h1 className="font-semibold text-[18px] text-text-primary tracking-[-0.01em]">
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

			<div className="mt-8 rounded-lg border border-border bg-card p-4">
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
		extensions: [StarterKit],
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
			<div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-[#e5e5e5] border-b bg-[#fafafa]/95 px-5 py-2.5 backdrop-blur">
				<button
					className="inline-flex items-center gap-1.5 text-[#525252] text-xs transition-colors hover:text-[#111] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
					onClick={onClose}
					type="button"
				>
					<IconArrowLeft aria-hidden="true" className="size-3.5" />
					Exit preview
				</button>

				<span className="rounded-full border border-[#e0e0e0] bg-white px-3 py-1 font-mono text-[#525252] text-[11px]">
					your-domain.com/{metadata.slug}
				</span>

				<span className="text-[#737373] text-[11px]">
					{isPublished ? "Published" : "Preview — not published"}
				</span>
			</div>

			<article className="mx-auto max-w-[680px] px-6 py-12">
				<h1 className="font-semibold text-[#111] text-[36px] leading-[1.2] tracking-[-0.02em]">
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

function EditorToolbar({ editor }: { editor: Editor | null }) {
	if (!editor) {
		return null;
	}

	return (
		<div
			aria-label="Editor formatting"
			className="flex flex-wrap gap-1 border-border border-b p-2"
			role="toolbar"
		>
			<EditorToolbarButton
				active={editor.isActive("bold")}
				label="Bold"
				onClick={() => editor.chain().focus().toggleBold().run()}
			/>
			<EditorToolbarButton
				active={editor.isActive("italic")}
				label="Italic"
				onClick={() => editor.chain().focus().toggleItalic().run()}
			/>
			<EditorToolbarButton
				active={editor.isActive("heading", { level: 2 })}
				label="Heading"
				onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
			/>
			<EditorToolbarButton
				active={editor.isActive("bulletList")}
				label="Bullets"
				onClick={() => editor.chain().focus().toggleBulletList().run()}
			/>
			<EditorToolbarButton
				active={editor.isActive("orderedList")}
				label="Numbered list"
				onClick={() => editor.chain().focus().toggleOrderedList().run()}
			/>
			<EditorToolbarButton
				active={editor.isActive("blockquote")}
				label="Quote"
				onClick={() => editor.chain().focus().toggleBlockquote().run()}
			/>
			<EditorToolbarButton
				active={editor.isActive("codeBlock")}
				label="Code block"
				onClick={() => editor.chain().focus().toggleCodeBlock().run()}
			/>
		</div>
	);
}

function EditorToolbarButton({
	active,
	label,
	onClick,
}: {
	active: boolean;
	label: string;
	onClick: () => void;
}) {
	return (
		<Button
			aria-pressed={active}
			size="sm"
			type="button"
			variant={active ? "secondary" : "ghost"}
			onClick={onClick}
		>
			{label}
		</Button>
	);
}

function EditorSaveStatus({
	bodyStatus,
	metadataStatus,
	metadataError,
	wordCount,
}: {
	bodyStatus: SaveStatus;
	metadataStatus: SaveStatus;
	metadataError: string | null;
	wordCount: number;
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
				"shrink-0 text-[11px] tabular-nums",
				hasError
					? "text-danger"
					: label === "Saved"
						? "text-success"
						: "text-text-muted",
			)}
		>
			{label} · {wordCount} words
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
