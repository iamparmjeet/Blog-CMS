import { useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { SegmentedControl } from "#/components/content-os/ui";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { formatNumber } from "#/lib/number";
import { NewDraftButton } from "../components/new-draft-button";
import { PostList } from "../components/post-list";
import { applyPostLifecycle } from "../functions/post-lifecycle.function";
import type { PostLifecycleAction } from "../functions/post-lifecycle.query";
import type { PostListItem } from "../functions/posts.types";

interface PostsPageProps {
	deletedPosts: PostListItem[];
	posts: PostListItem[];
	query: string;
	tab: PostTab;
}

export type PostTab = "all" | "published" | "drafts" | "deleted";

interface LifecycleActionOption {
	action: PostLifecycleAction;
	destructive?: boolean;
	label: string;
}

const EMPTY_STATES: Record<PostTab, { description: string; title: string }> = {
	all: {
		description: "Write your first post to get started.",
		title: "No posts yet",
	},
	deleted: {
		description:
			"Deleted posts stay here until you restore or permanently purge them.",
		title: "Trash is empty",
	},
	drafts: {
		description: "Start a new post to begin writing.",
		title: "No drafts",
	},
	published: {
		description: "Publish a draft to make it available in the public feed.",
		title: "No published posts",
	},
};

export function PostsPage({ deletedPosts, posts, query, tab }: PostsPageProps) {
	const router = useRouter();
	const navigate = useNavigate();
	const [selectedPostIds, setSelectedPostIds] = useState<number[]>([]);
	const [isApplyingAction, setIsApplyingAction] = useState(false);
	const [actionError, setActionError] = useState<string | null>(null);
	const [confirmAction, setConfirmAction] =
		useState<PostLifecycleAction | null>(null);
	const [draftQuery, setDraftQuery] = useState(query);
	const searchTimeoutRef = useRef<number | null>(null);

	useEffect(() => {
		setDraftQuery(query);
	}, [query]);

	useEffect(() => {
		return () => {
			if (searchTimeoutRef.current !== null) {
				window.clearTimeout(searchTimeoutRef.current);
			}
		};
	}, []);

	function submitQuery(nextQuery: string) {
		const trimmed = nextQuery.trim();

		void navigate({
			to: "/posts",
			search: (previous) => ({
				...previous,
				...(trimmed ? { q: trimmed } : { q: undefined }),
			}),
		});
	}

	function changeQuery(nextQuery: string) {
		setDraftQuery(nextQuery);

		if (searchTimeoutRef.current !== null) {
			window.clearTimeout(searchTimeoutRef.current);
		}

		searchTimeoutRef.current = window.setTimeout(() => {
			searchTimeoutRef.current = null;
			submitQuery(nextQuery);
		}, 300);
	}

	const visiblePosts = getVisiblePosts(tab, posts, deletedPosts);
	const selectedPosts = visiblePosts.filter((post) =>
		selectedPostIds.includes(post.id),
	);
	const actions = getAvailableLifecycleActions(
		selectedPosts,
		tab === "deleted",
	);
	const publishedCount = posts.filter(
		(post) => post.status === "published",
	).length;
	const draftCount = posts.filter((post) => post.status === "draft").length;
	const totalWords = posts.reduce((sum, post) => sum + post.wordCount, 0);
	const selectedCount = selectedPostIds.length;

	const tabs: { label: string; value: PostTab }[] = [
		{ label: "All", value: "all" },
		{ label: "Published", value: "published" },
		{ label: "Drafts", value: "drafts" },
		{
			label:
				deletedPosts.length > 0
					? `Deleted (${deletedPosts.length})`
					: "Deleted",
			value: "deleted",
		},
	];

	function changeTab(nextTab: PostTab) {
		setSelectedPostIds([]);
		setActionError(null);
		setConfirmAction(null);
		void navigate({
			to: "/posts",
			search: (previous) => ({ ...previous, tab: nextTab }),
		});
	}

	async function runLifecycleAction(action: PostLifecycleAction) {
		if (selectedPostIds.length === 0) {
			return;
		}

		setIsApplyingAction(true);
		setActionError(null);

		try {
			await applyPostLifecycle({ data: { action, postIds: selectedPostIds } });
			setSelectedPostIds([]);
			setConfirmAction(null);
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
		<main className="flex h-full min-h-0 flex-col">
			<header className="flex shrink-0 flex-col items-stretch justify-between gap-3 border-border border-b px-5 py-4 sm:flex-row sm:items-center sm:px-8">
				<div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
					<h1 className="font-semibold text-base text-text-primary tracking-[-0.02em]">
						Posts
					</h1>
					<SegmentedControl onChange={changeTab} options={tabs} value={tab} />
				</div>

				<div className="flex items-center gap-2">
					<Input
						aria-label="Search posts"
						className="h-9 w-full sm:w-56"
						maxLength={64}
						onChange={(event) => changeQuery(event.target.value)}
						placeholder="Search title, slug, or text…"
						type="search"
						value={draftQuery}
					/>
					{draftQuery ? (
						<Button
							aria-label="Clear search"
							onClick={() => {
								setDraftQuery("");
								submitQuery("");
							}}
							size="sm"
							type="button"
							variant="ghost"
						>
							Clear
						</Button>
					) : null}
					<NewDraftButton />
				</div>
			</header>

			{actionError ? (
				<p
					className="shrink-0 border-border-subtle border-b bg-danger/5 px-8 py-2 text-danger text-xs"
					role="alert"
				>
					{actionError}
				</p>
			) : null}

			{selectedCount > 0 ? (
				<div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-border-subtle border-b bg-white/[0.02] px-8 py-2.5">
					<p className="text-text-secondary text-xs">
						<span className="font-medium text-text-primary">
							{selectedCount}
						</span>{" "}
						selected
					</p>

					<div className="flex flex-wrap items-center gap-2">
						{confirmAction ? (
							<>
								<p className="text-text-secondary text-xs">
									{confirmAction === "purge"
										? `Delete ${selectedCount} ${selectedCount === 1 ? "post" : "posts"} permanently?`
										: `Move ${selectedCount} ${selectedCount === 1 ? "post" : "posts"} to trash?`}
								</p>
								<Button
									disabled={isApplyingAction}
									onClick={() => void runLifecycleAction(confirmAction)}
									size="sm"
									type="button"
									variant="destructive"
								>
									{isApplyingAction ? "Working…" : "Confirm"}
								</Button>
								<Button
									onClick={() => setConfirmAction(null)}
									size="sm"
									type="button"
									variant="ghost"
								>
									Cancel
								</Button>
							</>
						) : (
							<>
								{actions.map((option) => (
									<Button
										disabled={isApplyingAction}
										key={option.action}
										onClick={() => {
											if (option.destructive) {
												setConfirmAction(option.action);
												return;
											}

											void runLifecycleAction(option.action);
										}}
										size="sm"
										type="button"
										variant={option.destructive ? "destructive" : "outline"}
									>
										{option.label}
									</Button>
								))}
								<Button
									onClick={() => setSelectedPostIds([])}
									size="sm"
									type="button"
									variant="ghost"
								>
									Clear
								</Button>
							</>
						)}
					</div>
				</div>
			) : null}

			<PostList
				canOpenPosts={tab !== "deleted"}
				emptyDescription={EMPTY_STATES[tab].description}
				emptyTitle={EMPTY_STATES[tab].title}
				onSelectedPostIdsChange={setSelectedPostIds}
				posts={visiblePosts}
				selectedPostIds={new Set(selectedPostIds)}
			/>

			<footer className="shrink-0 border-border border-t px-5 py-2.5 text-[11px] text-text-muted sm:px-8">
				{publishedCount} published · {draftCount} drafts ·{" "}
				{formatNumber(totalWords)} total words
			</footer>
		</main>
	);
}

function getVisiblePosts(
	tab: PostTab,
	posts: PostListItem[],
	deletedPosts: PostListItem[],
): PostListItem[] {
	if (tab === "deleted") {
		return deletedPosts;
	}

	if (tab === "published") {
		return posts.filter((post) => post.status === "published");
	}

	if (tab === "drafts") {
		return posts.filter((post) => post.status === "draft");
	}

	return posts;
}

function getAvailableLifecycleActions(
	posts: PostListItem[],
	isDeletedTab: boolean,
): LifecycleActionOption[] {
	if (posts.length === 0) {
		return [];
	}

	if (isDeletedTab) {
		return [
			{ action: "restore", label: "Restore" },
			{
				action: "purge",
				destructive: true,
				label: "Delete permanently",
			},
		];
	}

	const statuses = new Set(posts.map((post) => post.status));
	const actions: LifecycleActionOption[] = [];

	if (statuses.size === 1 && statuses.has("draft")) {
		actions.push({ action: "publish", label: "Publish" });
	}

	if (statuses.size === 1 && statuses.has("published")) {
		actions.push({ action: "unpublish", label: "Unpublish" });
	}

	if (
		[...statuses].every(
			(status) =>
				status === "draft" || status === "published" || status === "scheduled",
		)
	) {
		actions.push({ action: "archive", label: "Archive" });
	}

	if (statuses.size === 1 && statuses.has("archived")) {
		actions.push({ action: "unarchive", label: "Move to drafts" });
	}

	actions.push({ action: "trash", destructive: true, label: "Delete" });

	return actions;
}
