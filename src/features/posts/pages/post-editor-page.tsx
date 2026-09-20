import {
	IconArrowLeft,
	IconEye,
	IconPencil,
	IconSearch,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
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
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Textarea } from "#/components/ui/textarea";
import {
	countWords,
	parseIncomingPostBody,
	serializePostBody,
} from "../functions/post-body";
import {
	getPostMetadataValidationError,
	type PostMetadata,
} from "../functions/post-metadata";
import type { PostEditorData } from "../functions/posts.types";
import { savePostBody } from "../functions/save-post-body.function";
import { savePostMetadata } from "../functions/save-post-metadata.function";

const AUTOSAVE_DELAY_MS = 700;

type SaveStatus = "saved" | "saving" | "local" | "error";
type EditorView = "write" | "seo" | "preview";

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
		<main className="min-h-screen bg-background text-foreground">
			<div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 sm:px-6 lg:px-8">
				<header className="flex flex-wrap items-center justify-between gap-3 border-border border-b py-3">
					<div className="min-w-0 text-sm">
						<Link
							to="/posts"
							className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
						>
							<IconArrowLeft aria-hidden="true" className="size-4" />
							Posts
						</Link>
					</div>

					<div className="flex items-center gap-2">
						<EditorSaveStatus
							bodyStatus={bodySaveStatus}
							metadataStatus={metadataSaveStatus}
							metadataError={metadataError}
							wordCount={wordCount}
						/>
						<EditorViewControls view={view} onViewChange={setView} />
					</div>
				</header>

				{view === "write" ? (
					<section className="mx-auto w-full max-w-4xl py-10 sm:py-14">
						<Input
							aria-label="Post title"
							className="h-auto border-0 bg-transparent px-0 py-1 font-semibold text-4xl tracking-tight placeholder:text-muted-foreground focus-visible:border-0 focus-visible:ring-0 sm:text-5xl"
							value={metadata.title}
							onChange={(event) => updateMetadata("title", event.target.value)}
						/>
						<div className="mt-3 flex items-center gap-2 text-muted-foreground text-sm">
							<span aria-hidden="true">/</span>
							<Input
								aria-describedby="slug-help"
								aria-invalid={
									metadataError?.toLowerCase().includes("slug")
										? true
										: undefined
								}
								aria-label="Post slug"
								className="h-auto max-w-md border-0 bg-transparent px-0 py-0 font-mono text-sm focus-visible:border-0 focus-visible:ring-0"
								value={metadata.slug}
								onChange={(event) => updateMetadata("slug", event.target.value)}
							/>
						</div>
						<p id="slug-help" className="sr-only">
							The URL stays stable when you change the title.
						</p>

						<div className="mt-8 border-border border-y">
							<EditorToolbar editor={editor} />
							<div className="min-h-120 py-8">
								<EditorContent editor={editor} />
							</div>
						</div>
					</section>
				) : null}

				{view === "seo" ? (
					<MetadataPanel
						metadata={metadata}
						error={metadataError}
						onChange={updateMetadata}
					/>
				) : null}

				{view === "preview" ? (
					<PostPreview body={deferredPreviewBody} metadata={metadata} />
				) : null}
			</div>
		</main>
	);
}

function EditorViewControls({
	view,
	onViewChange,
}: {
	view: EditorView;
	onViewChange: (view: EditorView) => void;
}) {
	return (
		<div
			aria-label="Post editor view"
			className="flex items-center gap-1"
			role="tablist"
		>
			<EditorViewButton
				active={view === "write"}
				icon={<IconPencil aria-hidden="true" />}
				label="Write"
				onClick={() => onViewChange("write")}
			/>
			<EditorViewButton
				active={view === "seo"}
				icon={<IconSearch aria-hidden="true" />}
				label="SEO"
				onClick={() => onViewChange("seo")}
			/>
			<EditorViewButton
				active={view === "preview"}
				icon={<IconEye aria-hidden="true" />}
				label="Preview"
				onClick={() => onViewChange("preview")}
			/>
		</div>
	);
}

function EditorViewButton({
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
			aria-selected={active}
			role="tab"
			size="sm"
			type="button"
			variant={active ? "secondary" : "ghost"}
			onClick={onClick}
		>
			{icon}
			{label}
		</Button>
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
		<section className="mx-auto w-full max-w-2xl py-10 sm:py-14">
			<div className="border-border border-b pb-6">
				<p className="font-medium text-muted-foreground text-sm">
					Search metadata
				</p>
				<h1 className="mt-2 font-semibold text-3xl tracking-tight">SEO</h1>
				<p className="mt-2 text-muted-foreground text-sm">
					Set the title and description used by search engines. The post URL
					stays stable unless you edit its slug.
				</p>
			</div>

			<div className="mt-8 space-y-6">
				<MetadataField label="SEO title" htmlFor="seo-title">
					<Input
						id="seo-title"
						maxLength={200}
						placeholder={metadata.title}
						value={metadata.seoTitle}
						onChange={(event) => onChange("seoTitle", event.target.value)}
					/>
				</MetadataField>

				<MetadataField label="SEO description" htmlFor="seo-description">
					<Textarea
						id="seo-description"
						maxLength={320}
						placeholder="Describe this post for search results..."
						value={metadata.description}
						onChange={(event) => onChange("description", event.target.value)}
					/>
				</MetadataField>

				<MetadataField label="Slug" htmlFor="seo-slug">
					<Input
						aria-invalid={
							error?.toLowerCase().includes("slug") ? true : undefined
						}
						id="seo-slug"
						maxLength={80}
						value={metadata.slug}
						onChange={(event) => onChange("slug", event.target.value)}
					/>
				</MetadataField>
			</div>

			{error ? (
				<p role="alert" className="mt-5 text-destructive text-sm">
					{error}
				</p>
			) : null}
		</section>
	);
}

function MetadataField({
	children,
	htmlFor,
	label,
}: {
	children: ReactNode;
	htmlFor: string;
	label: string;
}) {
	return (
		<div className="space-y-2">
			<label className="font-medium text-sm" htmlFor={htmlFor}>
				{label}
			</label>
			{children}
		</div>
	);
}

function PostPreview({
	body,
	metadata,
}: {
	body: string;
	metadata: PostMetadata;
}) {
	const previewEditor = useEditor({
		extensions: [StarterKit],
		content: parseIncomingPostBody(body),
		editable: false,
		editorProps: {
			attributes: {
				class:
					"prose prose-zinc max-w-none focus:outline-none dark:prose-invert",
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

	return (
		<section className="mx-auto w-full max-w-4xl py-10 sm:py-14">
			<div className="mb-10 rounded-lg border border-border bg-card p-5">
				<p className="font-medium text-muted-foreground text-xs uppercase tracking-[0.18em]">
					Search preview
				</p>
				<p className="mt-3 text-primary text-xl">
					{metadata.seoTitle || metadata.title}
				</p>
				<p className="mt-1 font-mono text-muted-foreground text-sm">
					/{metadata.slug}
				</p>
				{metadata.description ? (
					<p className="mt-2 text-muted-foreground text-sm">
						{metadata.description}
					</p>
				) : null}
			</div>

			<article className="mx-auto max-w-3xl">
				<header className="border-border border-b pb-8">
					<p className="font-mono text-muted-foreground text-sm">
						/{metadata.slug}
					</p>
					<h1 className="mt-4 font-semibold text-4xl tracking-tight sm:text-5xl">
						{metadata.title}
					</h1>
					{metadata.description ? (
						<p className="mt-5 text-lg text-muted-foreground">
							{metadata.description}
						</p>
					) : null}
				</header>
				<div className="py-10">
					<EditorContent editor={previewEditor} />
				</div>
			</article>
		</section>
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

	return (
		<p aria-live="polite" className="shrink-0 text-muted-foreground text-sm">
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
