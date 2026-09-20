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
import { useState } from "react";
import type { AuthenticatedUser } from "#/lib/auth/auth.types";
import { authClient } from "#/lib/auth/auth-client";
import { cn } from "#/lib/utils";
import { Button } from "../ui/button";
import { type SidebarPostContext, useSidebarPost } from "./sidebar-context";
import { AccentSwitch, SectionLabel, UserAvatar } from "./ui";

const NAV_ITEMS = [
	{ icon: IconLayoutDashboard, label: "Dashboard", to: "/dashboard" },
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
				"flex h-full w-60 shrink-0 flex-col border-border border-r bg-sidebar-bg",
				className,
			)}
		>
			<div className="flex items-center justify-between border-border border-b px-3 py-3">
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

			<nav aria-label="Main" className="flex flex-1 flex-col gap-1 p-2">
				{NAV_ITEMS.map((item) => (
					<SidebarNavItem item={item} key={item.to} onNavigate={onClose} />
				))}
			</nav>

			{resolvedPost ? <SidebarPostDetails post={resolvedPost} /> : null}

			<SidebarUserFooter user={user} />
		</aside>
	);
}

export function AppBrand() {
	return (
		<Link className="flex items-center gap-2" to="/dashboard">
			<span className="flex size-[22px] shrink-0 items-center justify-center rounded-md bg-linear-to-br from-brand to-indigo-600">
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
			<span className="font-semibold text-[13px] text-text-primary tracking-[-0.01em]">
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
			activeProps={{ className: "bg-white/[0.06] text-text-primary" }}
			className="flex items-center gap-2 rounded-md px-2 py-[5px] font-medium text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			inactiveProps={{
				className:
					"text-text-soft hover:bg-white/[0.04] hover:text-text-secondary",
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

	return (
		<div className="border-border border-t px-2 pt-3 pb-2">
			<SectionLabel className="px-2 pb-1">This post</SectionLabel>

			<div className="px-2 pb-2">
				<p className="line-clamp-2 font-medium text-text-body text-xs leading-[1.4]">
					{post.title}
				</p>
				<p className="mt-0.5 truncate font-mono text-[11px] text-text-muted">
					/{post.slug}
				</p>
			</div>

			<div className="mb-1.5 flex items-center justify-between gap-3 rounded-md border border-border bg-card px-2.5 py-2">
				<div className="min-w-0">
					<p className="font-medium text-text-secondary text-xs">
						{post.isPublished ? "Published" : "Draft"}
					</p>
					<p className="text-[11px] text-text-muted">
						{post.isPublished ? "Visible publicly" : "Not published"}
					</p>
				</div>

				<AccentSwitch
					checked={post.isPublished}
					onChange={(next) => post.onPublishChange?.(next)}
				/>
			</div>

			{post.isPublished ? null : <SchedulePicker />}

			<dl className="px-2 pt-1">
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

function SchedulePicker() {
	const [enabled, setEnabled] = useState(false);
	const [date, setDate] = useState("");

	const tomorrow = new Date();
	tomorrow.setDate(tomorrow.getDate() + 1);
	const minDate = tomorrow.toISOString().split("T")[0];

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
						className="w-full rounded border border-input bg-app-bg px-2 py-1 text-[11px] text-text-secondary outline-none transition-colors [color-scheme:dark] focus:border-text-dim"
						min={minDate}
						onChange={(event) => setDate(event.target.value)}
						type="datetime-local"
						value={date}
					/>
					{date ? (
						<p className="mt-1.5 font-medium text-[10px] text-brand">
							Will publish {new Date(date).toLocaleString()}
						</p>
					) : null}
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
		<div className="flex items-center gap-2.5 border-border border-t px-3 py-2.5">
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
