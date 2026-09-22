import {
	IconChartBar,
	IconFileText,
	IconLayoutDashboard,
	IconLogout,
	IconPhoto,
	IconSettings,
	IconX,
} from "@tabler/icons-react";
import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { PostStatus } from "#/features/posts/functions/posts.types";
import { savePostSchedule } from "#/features/posts/functions/save-post-schedule.function";
import {
	utcToDateTimeLocalInput,
	zonedDateTimeToUtc,
} from "#/features/posts/functions/schedule-time";
import type { AuthenticatedUser } from "#/lib/auth/auth.types";
import { authClient } from "#/lib/auth/auth-client";
import { cn } from "#/lib/utils";
import { Button } from "../ui/button";
import { type SidebarPostContext, useSidebarPost } from "./sidebar-context";
import { AccentSwitch, SectionLabel, UserAvatar } from "./ui";

const NAV_ITEMS = [
	{ icon: IconLayoutDashboard, label: "Home", to: "/dashboard" },
	{ icon: IconFileText, label: "Posts", to: "/posts" },
	{ icon: IconPhoto, label: "Media", to: "/media" },
	{ icon: IconChartBar, label: "Analytics", to: "/analytics" },
	{ icon: IconSettings, label: "Settings", to: "/settings" },
] as const;

interface SidebarProps {
	className?: string;
	onClose?: () => void;
	post?: SidebarPostContext | null;
	user: AuthenticatedUser;
}

export function Sidebar({ className, onClose, post, user }: SidebarProps) {
	const contextPost = useSidebarPost();
	const resolvedPost = post ?? contextPost;

	return (
		<aside
			className={cn(
				"flex h-full w-[286px] shrink-0 flex-col border-border border-r bg-sidebar-bg",
				className,
			)}
		>
			<div className="flex h-14 items-center justify-between border-border border-b px-4">
				<AppBrand />

				{onClose ? (
					<Button
						aria-label="Close navigation"
						className="text-text-soft lg:hidden"
						size="icon-sm"
						type="button"
						variant="ghost"
						onClick={onClose}
					>
						<IconX aria-hidden="true" className="size-4" />
					</Button>
				) : null}
			</div>

			<nav aria-label="Main" className="flex flex-col gap-0.5 px-2 py-3">
				{NAV_ITEMS.map((item) => (
					<SidebarNavItem item={item} key={item.to} onNavigate={onClose} />
				))}
			</nav>

			{resolvedPost ? <SidebarPostDetails post={resolvedPost} /> : null}
			<div className="flex-1" />

			<SidebarUserFooter user={user} />
		</aside>
	);
}

export function AppBrand() {
	return (
		<Link className="flex items-center gap-2.5" to="/dashboard">
			<span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
				<svg
					aria-hidden="true"
					fill="none"
					height="12"
					viewBox="0 0 12 12"
					width="12"
				>
					<path
						d="M2 3h5M2 6h8M2 9h6"
						stroke="#fff"
						strokeLinecap="round"
						strokeWidth="1.5"
					/>
				</svg>
			</span>
			<span className="font-semibold text-sm text-text-primary tracking-[-0.02em]">
				content<span className="font-normal text-text-soft">.os</span>
			</span>
		</Link>
	);
}

function SidebarNavItem({
	item,
	onNavigate,
}: {
	item: (typeof NAV_ITEMS)[number];
	onNavigate?: () => void;
}) {
	return (
		<Link
			activeProps={{
				className:
					"before:bg-brand bg-white/[0.06] text-text-primary before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full",
			}}
			className="relative flex min-h-8 items-center gap-3 rounded-md px-3 font-medium text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			inactiveProps={{
				className:
					"text-text-soft hover:bg-white/[0.04] hover:text-text-primary",
			}}
			onClick={onNavigate}
			to={item.to}
		>
			{({ isActive }) => (
				<>
					<item.icon
						aria-hidden="true"
						className={cn("size-4 shrink-0", isActive && "text-brand")}
					/>
					<span className="flex-1">{item.label}</span>
				</>
			)}
		</Link>
	);
}

function SidebarPostDetails({ post }: { post: SidebarPostContext }) {
	const readMinutes = Math.max(1, Math.ceil(post.wordCount / 200));
	const statusLabel =
		post.status === "published"
			? "Published"
			: post.status === "scheduled"
				? "Scheduled"
				: post.status === "archived"
					? "Archived"
					: "Draft";
	const statusHint =
		post.status === "published"
			? "Visible publicly"
			: post.status === "scheduled" && post.scheduledAt
				? `Goes public ${new Date(post.scheduledAt).toLocaleString(undefined, {
						timeZone: post.timeZone,
					})}`
				: "Not published";

	return (
		<div className="border-border border-t px-2 pt-3 pb-3">
			<SectionLabel className="border-border-subtle border-b px-2 pb-2">
				This post
			</SectionLabel>

			<div className="px-2 py-4">
				<p className="line-clamp-2 font-medium text-sm text-text-body leading-[1.4]">
					{post.title}
				</p>
				<p className="mt-2 break-all font-mono text-[11px] text-text-muted leading-relaxed">
					/{post.slug}
				</p>
			</div>

			<div className="mb-3 flex items-center justify-between gap-3 rounded-md border border-border bg-flat-surface px-3 py-2.5">
				<div className="min-w-0">
					<p className="font-medium text-text-secondary text-xs">
						{statusLabel}
					</p>
					<p className="text-[11px] text-text-muted">{statusHint}</p>
				</div>

				<AccentSwitch
					checked={post.isPublished}
					onChange={(next) => post.onPublishChange?.(next)}
				/>
			</div>

			{post.isPublished || post.status === "archived" ? null : (
				<SchedulePicker
					postId={post.postId}
					scheduledAt={post.scheduledAt}
					status={post.status}
					timeZone={post.timeZone}
				/>
			)}

			<dl className="px-2 pt-2">
				<PostMetaRow label="Words" value={post.wordCount.toLocaleString()} />
				<PostMetaRow label="Read time" value={`${readMinutes} min`} />
				<PostMetaRow label="Updated" value={post.updatedAt || "just now"} />
			</dl>
		</div>
	);
}

function PostMetaRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-center justify-between py-1">
			<dt className="text-text-muted text-xs">{label}</dt>
			<dd className="font-mono text-text-soft text-xs tabular-nums">{value}</dd>
		</div>
	);
}

function SchedulePicker({
	postId,
	status,
	scheduledAt,
	timeZone,
}: {
	postId: number;
	status: PostStatus;
	scheduledAt: string | null;
	timeZone: string;
}) {
	const router = useRouter();
	const [enabled, setEnabled] = useState(status === "scheduled");
	const [date, setDate] = useState(
		scheduledAt ? utcToDateTimeLocalInput(new Date(scheduledAt), timeZone) : "",
	);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		setEnabled(status === "scheduled");
		setDate(
			scheduledAt
				? utcToDateTimeLocalInput(new Date(scheduledAt), timeZone)
				: "",
		);
	}, [status, scheduledAt, timeZone]);

	const minDate = utcToDateTimeLocalInput(new Date(), timeZone).slice(0, 16);

	async function persist(nextDate: string | null) {
		setIsSaving(true);
		setError(null);

		try {
			await savePostSchedule({
				data: { postId, dateTimeLocal: nextDate },
			});
			await router.invalidate();
		} catch (saveError) {
			setError(
				saveError instanceof Error
					? saveError.message
					: "Could not save the schedule",
			);
		} finally {
			setIsSaving(false);
		}
	}

	function previewLabel(value: string): string | null {
		try {
			return zonedDateTimeToUtc(value, timeZone).toLocaleString(undefined, {
				timeZone,
			});
		} catch {
			return null;
		}
	}

	const preview = date ? previewLabel(date) : null;

	return (
		<div className="mb-1.5 overflow-hidden rounded-md border border-border">
			<button
				className="flex w-full items-center justify-between bg-transparent px-2.5 py-1.5 text-left transition-colors hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				onClick={() => setEnabled((value) => !value)}
				type="button"
			>
				<span className="text-[11px] text-text-muted">Schedule publish</span>
				<AccentSwitch checked={enabled} onChange={setEnabled} />
			</button>

			{enabled ? (
				<div className="border-border border-t px-2.5 py-2">
					<input
						aria-label="Scheduled publish time"
						className="w-full rounded border border-input bg-app-bg px-2 py-1 text-[11px] text-text-secondary outline-none transition-colors [color-scheme:dark] focus:border-text-dim"
						min={minDate}
						onChange={(event) => setDate(event.target.value)}
						type="datetime-local"
						value={date}
					/>
					{preview ? (
						<p className="mt-1.5 font-medium text-[10px] text-brand">
							Will publish {preview}
						</p>
					) : null}
					{error ? (
						<p className="mt-1.5 text-[10px] text-danger" role="alert">
							{error}
						</p>
					) : null}
					<div className="mt-2 flex items-center gap-2">
						<button
							className="flex-1 rounded-md bg-brand px-2 py-1.5 font-medium text-[11px] text-white transition-opacity disabled:opacity-50"
							disabled={!date || isSaving}
							onClick={() => void persist(date || null)}
							type="button"
						>
							{isSaving ? "Saving…" : "Save schedule"}
						</button>
						{status === "scheduled" ? (
							<button
								className="rounded-md border border-border px-2 py-1.5 text-[11px] text-text-muted transition-colors hover:text-text-secondary disabled:opacity-50"
								disabled={isSaving}
								onClick={() => void persist(null)}
								type="button"
							>
								Clear
							</button>
						) : null}
					</div>
				</div>
			) : null}
		</div>
	);
}

function SidebarUserFooter({ user }: { user: AuthenticatedUser }) {
	const router = useRouter();

	async function handleSignOut() {
		await authClient.signOut();
		await router.invalidate();
		await router.navigate({ to: "/login" });
	}

	return (
		<div className="flex items-center gap-2.5 border-border border-t px-4 py-3">
			<UserAvatar image={user.image} name={user.name} />

			<div className="min-w-0 flex-1">
				<p className="truncate font-medium text-[13px] text-text-body">
					{user.name}
				</p>
				<p className="truncate text-[11px] text-text-muted">{user.email}</p>
			</div>

			<Button
				aria-label="Sign out"
				className="text-text-muted hover:text-text-secondary"
				size="icon-sm"
				type="button"
				variant="ghost"
				onClick={() => void handleSignOut()}
			>
				<IconLogout aria-hidden="true" className="size-4" />
			</Button>
		</div>
	);
}
