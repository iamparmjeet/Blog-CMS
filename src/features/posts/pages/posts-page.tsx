import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { NewDraftButton } from "../components/new-draft-button";
import { PostList } from "../components/post-list";
import { applyPostLifecycle } from "../functions/post-lifecycle.function";
import type { PostLifecycleAction } from "../functions/post-lifecycle.query";
import type { PostListItem, PostStatus } from "../functions/posts.types";

interface PostsPageProps {
	deletedPosts: PostListItem[];
	posts: PostListItem[];
}

type PostSection = "posts" | "trash";

export function PostsPage({ deletedPosts, posts }: PostsPageProps) {
	const router = useRouter();
	const [section, setSection] = useState<PostSection>("posts");
	const [selectedPostIds, setSelectedPostIds] = useState<number[]>([]);
	const [isApplyingAction, setIsApplyingAction] = useState(false);
	const [actionError, setActionError] = useState<string | null>(null);
	const displayedPosts = section === "posts" ? posts : deletedPosts;
	const selectedPosts = displayedPosts.filter((post) =>
		selectedPostIds.includes(post.id),
	);

	function changeSection(nextSection: PostSection) {
		setSection(nextSection);
		setSelectedPostIds([]);
		setActionError(null);
	}

	async function runLifecycleAction(action: PostLifecycleAction) {
		if (selectedPostIds.length === 0) {
			return;
		}

		if (
			action === "purge" &&
			!window.confirm(
				`Permanently delete ${selectedPostIds.length} post${selectedPostIds.length === 1 ? "" : "s"}? This cannot be undone.`,
			)
		) {
			return;
		}

		setIsApplyingAction(true);
		setActionError(null);

		try {
			await applyPostLifecycle({ data: { action, postIds: selectedPostIds } });
			setSelectedPostIds([]);
			await router.invalidate();
		} catch (error) {
			setActionError(
				error instanceof Error ? error.message : "Could not update the posts",
			);
		} finally {
			setIsApplyingAction(false);
		}
	}

	return (
		<main className="min-h-screen bg-background text-foreground">
			<div className="mx-auto flex max-w-6xl flex-col px-4 sm:px-6 lg:px-8">
				<header className="flex flex-col gap-4 border-border border-b py-5 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h1 className="font-semibold text-2xl tracking-tight">Posts</h1>
					</div>

					<NewDraftButton />
				</header>

				<section aria-label="Posts" className="py-5">
					<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
						<div
							aria-label="Post collection"
							className="flex gap-1"
							role="tablist"
						>
							<CollectionButton
								active={section === "posts"}
								label={`Posts (${posts.length})`}
								onClick={() => changeSection("posts")}
							/>
							<CollectionButton
								active={section === "trash"}
								label={`Trash (${deletedPosts.length})`}
								onClick={() => changeSection("trash")}
							/>
						</div>

						<LifecycleActions
							isApplyingAction={isApplyingAction}
							posts={selectedPosts}
							section={section}
							onAction={runLifecycleAction}
						/>
					</div>

					{actionError ? (
						<p role="alert" className="mb-4 text-destructive text-sm">
							{actionError}
						</p>
					) : null}

					<PostList
						canOpenPosts={section === "posts"}
						emptyDescription={
							section === "posts"
								? "Create your first draft to start writing."
								: "Deleted posts stay here until you restore or permanently purge them."
						}
						emptyTitle={section === "posts" ? "No posts yet" : "Trash is empty"}
						onSelectedPostIdsChange={setSelectedPostIds}
						posts={displayedPosts}
						selectedPostIds={new Set(selectedPostIds)}
					/>
				</section>
			</div>
		</main>
	);
}

function CollectionButton({
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
			aria-selected={active}
			role="tab"
			size="sm"
			type="button"
			variant={active ? "secondary" : "ghost"}
			onClick={onClick}
		>
			{label}
		</Button>
	);
}

function LifecycleActions({
	isApplyingAction,
	onAction,
	posts,
	section,
}: {
	isApplyingAction: boolean;
	onAction: (action: PostLifecycleAction) => void;
	posts: PostListItem[];
	section: PostSection;
}) {
	const actions = getAvailableLifecycleActions(posts, section);

	if (actions.length === 0) {
		return null;
	}

	return (
		<fieldset className="flex flex-wrap gap-2 border-0 p-0">
			<legend className="sr-only">Bulk post actions</legend>
			{actions.map((action) => (
				<Button
					key={action.action}
					disabled={isApplyingAction}
					size="sm"
					type="button"
					variant={action.action === "purge" ? "destructive" : "outline"}
					onClick={() => onAction(action.action)}
				>
					{action.label}
				</Button>
			))}
		</fieldset>
	);
}

function getAvailableLifecycleActions(
	posts: PostListItem[],
	section: PostSection,
): { action: PostLifecycleAction; label: string }[] {
	if (posts.length === 0) {
		return [];
	}

	if (section === "trash") {
		return [
			{ action: "restore", label: "Restore" },
			{ action: "purge", label: "Permanently delete" },
		];
	}

	const statuses = new Set<PostStatus>(posts.map((post) => post.status));
	const actions: { action: PostLifecycleAction; label: string }[] = [
		{ action: "trash", label: "Move to trash" },
	];

	if (statuses.size === 1 && statuses.has("draft")) {
		actions.unshift({ action: "publish", label: "Publish" });
	}
	if (statuses.size === 1 && statuses.has("published")) {
		actions.unshift({ action: "unpublish", label: "Unpublish" });
	}
	if (
		[...statuses].every(
			(status) =>
				status === "draft" || status === "published" || status === "scheduled",
		)
	) {
		actions.unshift({ action: "archive", label: "Archive" });
	}
	if (statuses.size === 1 && statuses.has("archived")) {
		actions.unshift({ action: "unarchive", label: "Move to drafts" });
	}

	return actions;
}
