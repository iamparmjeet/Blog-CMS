import {
	IconChartBar,
	IconFileText,
	IconLayoutDashboard,
	IconPhoto,
	IconPlus,
	IconSearch,
	IconSettings,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { type ElementType, useMemo, useState } from "react";
import {
	EmptyState,
	SegmentedControl,
	StatusBadge,
} from "#/components/content-os/ui";
import { PageOwlLogo } from "#/components/shared/page-owl-logo";
import { Button, buttonVariants } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { DashBoardPage } from "#/features/dashboard/dashboard-page";
import { getDateKeyInTimeZone } from "#/features/dashboard/writing-activity/writing.utils";
import { slugForTitle } from "#/features/posts/functions/posts.utils";
import type { AuthenticatedUser } from "#/lib/auth/auth.types";
import { formatDate } from "#/lib/date";
import { formatNumber } from "#/lib/number";
import { cn } from "#/lib/utils";
import {
	buildDemoDashboard,
	buildDemoPosts,
	DEMO_TIME_ZONE,
	type DemoPost,
} from "./demo-data";
import { DemoEditor } from "./demo-editor";

type DemoView =
	| "dashboard"
	| "posts"
	| "editor"
	| "media"
	| "analytics"
	| "settings";

type PostFilter = "all" | "drafts" | "published" | "scheduled";
type PlaceholderView = "media" | "analytics" | "settings";

const NAV_ITEMS: readonly {
	icon: ElementType;
	id: Exclude<DemoView, "editor">;
	label: string;
}[] = [
	{ icon: IconLayoutDashboard, id: "dashboard", label: "Dashboard" },
	{ icon: IconFileText, id: "posts", label: "Posts" },
	{ icon: IconPhoto, id: "media", label: "Media" },
	{ icon: IconChartBar, id: "analytics", label: "Analytics" },
	{ icon: IconSettings, id: "settings", label: "Settings" },
];

const POST_FILTERS: readonly { label: string; value: PostFilter }[] = [
	{ label: "All", value: "all" },
	{ label: "Drafts", value: "drafts" },
	{ label: "Published", value: "published" },
	{ label: "Scheduled", value: "scheduled" },
];

const PLACEHOLDERS: Record<
	PlaceholderView,
	{ description: string; icon: ElementType; title: string }
> = {
	media: {
		description:
			"Presigned uploads, optimized previews, and reference-safe deletion are not part of the sandbox.",
		icon: IconPhoto,
		title: "Media library",
	},
	analytics: {
		description:
			"The owner dashboard embeds your Umami share URL. Self-host to connect your own.",
		icon: IconChartBar,
		title: "Analytics",
	},
	settings: {
		description:
			"Appearance, identity, publishing toggles, and the CORS allowlist live here in a real instance.",
		icon: IconSettings,
		title: "Settings",
	},
};

const DEMO_USER: AuthenticatedUser = {
	email: "demo@pageowl.app",
	emailVerified: true,
	id: "demo-owner",
	image: null,
	name: "Demo Writer",
};

export function DemoApp() {
	const [posts, setPosts] = useState<DemoPost[]>(() =>
		buildDemoPosts(new Date()),
	);
	const [view, setView] = useState<DemoView>("dashboard");
	const [openPostId, setOpenPostId] = useState<number | null>(null);
	const [filter, setFilter] = useState<PostFilter>("all");
	const [search, setSearch] = useState("");

	const today = useMemo(
		() => getDateKeyInTimeZone(new Date(), DEMO_TIME_ZONE),
		[],
	);
	const dashboard = useMemo(
		() => buildDemoDashboard(posts, today),
		[posts, today],
	);
	const openPost =
		openPostId === null
			? null
			: (posts.find((post) => post.id === openPostId) ?? null);
	const takenSlugs = useMemo(
		() =>
			posts.filter((post) => post.id !== openPostId).map((post) => post.slug),
		[posts, openPostId],
	);

	const visiblePosts = useMemo(() => {
		const needle = search.trim().toLowerCase();

		return posts.filter((post) => {
			if (filter === "drafts" && post.status !== "draft") {
				return false;
			}

			if (filter === "published" && post.status !== "published") {
				return false;
			}

			if (filter === "scheduled" && post.status !== "scheduled") {
				return false;
			}

			if (!needle) {
				return true;
			}

			return [post.title, post.slug, post.description].some((value) =>
				value.toLowerCase().includes(needle),
			);
		});
	}, [filter, posts, search]);

	function openEditor(postId: number) {
		setOpenPostId(postId);
		setView("editor");
	}

	function showPosts(next?: PostFilter) {
		if (next) {
			setFilter(next);
		}

		setView("posts");
	}

	function selectView(next: Exclude<DemoView, "editor">) {
		setView(next);
	}

	function createPost() {
		const id = posts.reduce((max, post) => Math.max(max, post.id), 0) + 1;
		const now = new Date().toISOString();

		setPosts((previous) => [
			{
				body: "<p></p>",
				description: "",
				id,
				seoTitle: "",
				slug: slugForTitle(
					"Untitled",
					new Set(previous.map((post) => post.slug)),
				),
				status: "draft",
				title: "Untitled",
				updatedAt: now,
				wordCount: 0,
			},
			...previous,
		]);
		openEditor(id);
	}

	function updatePost(postId: number, patch: Partial<DemoPost>) {
		setPosts((previous) =>
			previous.map((post) =>
				post.id === postId
					? { ...post, ...patch, updatedAt: new Date().toISOString() }
					: post,
			),
		);
	}

	return (
		<div className="mx-auto max-w-7xl px-3 pt-24 pb-20 sm:px-6 sm:pt-28 lg:px-8">
			<div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
				<div className="max-w-2xl">
					<p className="font-semibold text-brand text-xs uppercase tracking-[0.06em]">
						Live demo
					</p>
					<h1 className="mt-2 font-semibold text-3xl tracking-[-0.03em] sm:text-4xl">
						Explore PageOwl without signing up
					</h1>
					<p className="mt-3 text-[15px] text-muted-foreground leading-relaxed">
						A sandbox with sample posts. Type in the editor, switch views, and
						publish — everything stays in your browser.
					</p>
				</div>

				<div className="flex flex-wrap gap-2">
					<a
						className={cn(buttonVariants({ size: "lg" }), "gap-2")}
						href="/#open-source"
					>
						Self-host it free
					</a>
					<Link
						className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
						to="/login"
					>
						Owner sign in
					</Link>
				</div>
			</div>

			<div className="pageowl-demo mt-8 overflow-hidden rounded-xl border border-border bg-app-bg shadow-[0_18px_60px_rgba(7,29,85,0.12)]">
				<div className="flex h-[72vh] min-h-[560px] flex-col lg:flex-row">
					<aside className="hidden w-52 shrink-0 flex-col border-border border-r bg-sidebar-bg lg:flex">
						<div className="flex h-14 items-center gap-2 border-border border-b px-4">
							<PageOwlLogo
								animated={false}
								aria-hidden="true"
								className="size-7"
								showWordmark={false}
							/>
							<span className="font-bold text-[15px] text-text-primary tracking-[-0.04em]">
								Page<span className="text-brand">Owl</span>
							</span>
						</div>

						<nav className="flex flex-col gap-0.5 p-2">
							{NAV_ITEMS.map(({ icon: Icon, id, label }) => (
								<button
									className={cn(
										"flex items-center gap-2 rounded-md px-3 py-2 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
										view === id
											? "bg-sidebar-accent text-text-primary"
											: "text-text-muted hover:text-text-secondary",
									)}
									key={id}
									onClick={() => selectView(id)}
									type="button"
								>
									<Icon aria-hidden="true" className="size-4" />
									{label}
								</button>
							))}
						</nav>

						<div className="mt-auto border-border border-t p-3">
							<p className="text-[10px] text-text-muted leading-relaxed">
								Demo data only.
								<br />
								Nothing is saved.
							</p>
						</div>
					</aside>

					<div className="flex min-w-0 flex-1 flex-col">
						<div className="flex items-center gap-1 overflow-x-auto border-border border-b bg-sidebar-bg px-2 py-2 lg:hidden">
							{NAV_ITEMS.map(({ icon: Icon, id, label }) => (
								<button
									className={cn(
										"inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
										view === id
											? "bg-sidebar-accent text-text-primary"
											: "text-text-muted",
									)}
									key={id}
									onClick={() => selectView(id)}
									type="button"
								>
									<Icon aria-hidden="true" className="size-3.5" />
									{label}
								</button>
							))}
						</div>

						<div className="min-w-0 flex-1 overflow-y-auto">
							{view === "dashboard" ? (
								<DashBoardPage
									data={dashboard}
									onCreateDraft={createPost}
									onOpenPost={openEditor}
									onSelectTab={showPosts}
									onViewAllPosts={() => showPosts("all")}
									user={DEMO_USER}
								/>
							) : null}

							{view === "posts" ? (
								<DemoPosts
									filter={filter}
									onCreate={createPost}
									onFilterChange={setFilter}
									onOpen={openEditor}
									onSearchChange={setSearch}
									posts={visiblePosts}
									search={search}
								/>
							) : null}

							{view === "editor" && openPost ? (
								<DemoEditor
									key={openPost.id}
									onBack={() => showPosts()}
									onChange={(patch) => updatePost(openPost.id, patch)}
									post={openPost}
									takenSlugs={takenSlugs}
								/>
							) : null}

							{view === "editor" && !openPost ? (
								<EmptyState
									action={
										<Button
											onClick={() => showPosts("all")}
											size="sm"
											type="button"
											variant="brand"
										>
											Back to posts
										</Button>
									}
									description="Open a post from the list to start editing."
									icon={<IconFileText aria-hidden="true" className="size-5" />}
									title="No post open"
								/>
							) : null}

							{view === "media" ||
							view === "analytics" ||
							view === "settings" ? (
								<DemoPlaceholder view={view} />
							) : null}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

function DemoPosts({
	filter,
	onCreate,
	onFilterChange,
	onOpen,
	onSearchChange,
	posts,
	search,
}: {
	filter: PostFilter;
	onCreate: () => void;
	onFilterChange: (filter: PostFilter) => void;
	onOpen: (postId: number) => void;
	onSearchChange: (search: string) => void;
	posts: DemoPost[];
	search: string;
}) {
	return (
		<div className="flex h-full flex-col">
			<header className="flex flex-wrap items-center gap-2 border-border border-b px-3 py-3 sm:px-4">
				<h2 className="font-semibold text-sm text-text-primary">Posts</h2>
				<span className="text-[11px] text-text-muted tabular-nums">
					{posts.length} shown
				</span>
				<Button
					className="ml-auto gap-1.5"
					onClick={onCreate}
					size="sm"
					type="button"
					variant="brand"
				>
					<IconPlus aria-hidden="true" className="size-3.5" />
					New post
				</Button>
			</header>

			<div className="flex flex-wrap items-center gap-2 border-border border-b px-3 py-2 sm:px-4">
				<SegmentedControl
					ariaLabel="Filter posts"
					onChange={onFilterChange}
					options={POST_FILTERS}
					value={filter}
				/>
				<div className="relative ml-auto w-full sm:w-56">
					<IconSearch
						aria-hidden="true"
						className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-text-dim"
					/>
					<Input
						aria-label="Search posts"
						className="pl-7"
						onChange={(event) => onSearchChange(event.target.value)}
						placeholder="Search posts"
						value={search}
					/>
				</div>
			</div>

			{posts.length === 0 ? (
				<EmptyState
					description="Try another filter or search term."
					icon={<IconFileText aria-hidden="true" className="size-5" />}
					title="No posts match"
				/>
			) : (
				<ul>
					{posts.map((post) => (
						<li key={post.id}>
							<button
								className="flex w-full items-center gap-3 border-border-subtle border-b px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-flat-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
								onClick={() => onOpen(post.id)}
								type="button"
							>
								<span className="min-w-0 flex-1">
									<span className="block truncate font-medium text-[13px] text-text-primary">
										{post.title}
									</span>
									<span className="mt-0.5 block truncate font-mono text-[10px] text-text-dim">
										/{post.slug}
									</span>
								</span>
								<span className="hidden text-[11px] text-text-muted tabular-nums sm:block">
									{formatNumber(post.wordCount)} words
								</span>
								<StatusBadge status={post.status} />
								<span className="hidden w-20 text-right text-[11px] text-text-muted md:block">
									{formatDate(post.updatedAt)}
								</span>
							</button>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

function DemoPlaceholder({ view }: { view: PlaceholderView }) {
	const { description, icon: Icon, title } = PLACEHOLDERS[view];

	return (
		<EmptyState
			action={
				<a className={cn(buttonVariants({ size: "sm" }))} href="/#open-source">
					Self-host to try it
				</a>
			}
			description={description}
			icon={<Icon aria-hidden="true" className="size-5" />}
			title={title}
		/>
	);
}
