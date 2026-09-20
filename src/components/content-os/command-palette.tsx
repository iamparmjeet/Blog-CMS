import {
	IconChartBar,
	IconFileText,
	IconLayoutDashboard,
	IconLogout,
	IconPhoto,
	IconPlus,
	IconSearch,
	IconSettings,
	IconX,
} from "@tabler/icons-react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { authClient } from "#/lib/auth/auth-client";
import { cn } from "#/lib/utils";
import { Kbd } from "./ui";

type CommandGroup = "Navigate" | "Actions";

interface CommandItem {
	danger?: boolean;
	group: CommandGroup;
	icon: React.ReactNode;
	id: string;
	label: string;
	run: () => void;
	shortcut?: string;
}

interface CommandPaletteProps {
	onClose: () => void;
	onShowShortcuts: () => void;
	open: boolean;
}

export function CommandPalette({
	onClose,
	onShowShortcuts,
	open,
}: CommandPaletteProps) {
	const navigate = useNavigate();
	const router = useRouter();
	const [query, setQuery] = useState("");
	const [selectedIndex, setSelectedIndex] = useState(0);
	const inputRef = useRef<HTMLInputElement>(null);

	const commands = useMemo<CommandItem[]>(() => {
		const go = (label: string, to: string, icon: React.ReactNode) => ({
			group: "Navigate" as const,
			icon,
			id: `go-${to}`,
			label: `Go to ${label}`,
			run: () => void navigate({ to }),
		});

		return [
			go("Dashboard", "/dashboard", <IconLayoutDashboard />),
			go("Posts", "/posts", <IconFileText />),
			go("Media", "/media", <IconPhoto />),
			go("Analytics", "/analytics", <IconChartBar />),
			go("Settings", "/settings", <IconSettings />),
			{
				group: "Navigate",
				icon: <IconPlus />,
				id: "new-post",
				label: "New post",
				run: () => void navigate({ to: "/posts" }),
				shortcut: "⌘ N",
			},
			{
				group: "Actions",
				icon: <IconSearch />,
				id: "shortcuts",
				label: "Keyboard shortcuts",
				run: onShowShortcuts,
				shortcut: "⌘ ?",
			},
			{
				danger: true,
				group: "Actions",
				icon: <IconLogout />,
				id: "sign-out",
				label: "Sign out",
				run: () => {
					void authClient.signOut().then(async () => {
						await router.invalidate();
						await router.navigate({ to: "/login" });
					});
				},
			},
		];
	}, [navigate, onShowShortcuts, router]);

	const filteredCommands = useMemo(() => {
		const normalized = query.trim().toLowerCase();

		return normalized
			? commands.filter((command) =>
					command.label.toLowerCase().includes(normalized),
				)
			: commands;
	}, [commands, query]);

	useEffect(() => {
		if (!open) {
			return;
		}

		setQuery("");
		setSelectedIndex(0);

		const timeout = window.setTimeout(() => inputRef.current?.focus(), 40);

		return () => window.clearTimeout(timeout);
	}, [open]);

	if (!open) {
		return null;
	}

	let flatIndex = -1;
	const groups: { group: CommandGroup; items: CommandItem[] }[] = [];

	for (const command of filteredCommands) {
		const existing = groups.find((entry) => entry.group === command.group);

		if (existing) {
			existing.items.push(command);
		} else {
			groups.push({ group: command.group, items: [command] });
		}
	}

	function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
		if (event.key === "ArrowDown") {
			event.preventDefault();
			setSelectedIndex((index) =>
				Math.min(index + 1, filteredCommands.length - 1),
			);
			return;
		}

		if (event.key === "ArrowUp") {
			event.preventDefault();
			setSelectedIndex((index) => Math.max(index - 1, 0));
			return;
		}

		if (event.key === "Enter") {
			event.preventDefault();
			const command = filteredCommands[selectedIndex];

			if (command) {
				command.run();
				onClose();
			}
		}
	}

	return (
		<div className="fixed inset-0 z-[9000] flex items-start justify-center px-4 pt-[16vh]">
			<button
				aria-label="Close command palette"
				className="absolute inset-0 bg-black/55 backdrop-blur-[6px]"
				onClick={onClose}
				type="button"
			/>

			<div
				className="relative w-full max-w-[560px] animate-palette-in overflow-hidden rounded-xl border border-border bg-sidebar-bg shadow-[0_32px_96px_rgba(0,0,0,0.8)]"
				role="dialog"
				aria-label="Command palette"
			>
				<div className="flex items-center gap-3 border-border-subtle border-b px-3.5 py-3">
					<IconSearch
						aria-hidden="true"
						className="size-3.5 shrink-0 text-text-dim"
					/>
					<input
						aria-label="Search commands"
						className="min-w-0 flex-1 bg-transparent text-sm text-text-primary caret-brand outline-none placeholder:text-text-soft"
						onChange={(event) => {
							setQuery(event.target.value);
							setSelectedIndex(0);
						}}
						onKeyDown={handleKeyDown}
						placeholder="Search or jump to…"
						ref={inputRef}
						value={query}
					/>
					<Kbd>esc</Kbd>
				</div>

				<div className="max-h-[360px] overflow-y-auto py-1">
					{filteredCommands.length === 0 ? (
						<p className="px-3.5 py-6 text-center text-sm text-text-dim">
							No results for “{query}”
						</p>
					) : (
						groups.map((entry) => (
							<div key={entry.group}>
								<p className="px-3.5 pt-2 pb-1 font-semibold text-[10px] text-text-faint uppercase tracking-[0.07em]">
									{entry.group}
								</p>

								{entry.items.map((command) => {
									flatIndex += 1;
									const isSelected = flatIndex === selectedIndex;
									const itemIndex = flatIndex;

									return (
										<button
											className={cn(
												"flex w-full items-center gap-2.5 border-l-2 px-3.5 py-2 text-left text-[13px] transition-colors",
												isSelected
													? "border-brand bg-brand/10"
													: "border-transparent",
												command.danger
													? "text-danger"
													: isSelected
														? "text-text-primary"
														: "text-text-secondary",
											)}
											key={command.id}
											onClick={() => {
												command.run();
												onClose();
											}}
											onMouseEnter={() => setSelectedIndex(itemIndex)}
											type="button"
										>
											<span
												aria-hidden="true"
												className="shrink-0 text-text-muted [&>svg]:size-3.5"
											>
												{command.icon}
											</span>
											<span className="flex-1 truncate">{command.label}</span>
											{command.shortcut ? (
												<span className="font-mono text-[11px] text-text-muted">
													{command.shortcut}
												</span>
											) : isSelected ? (
												<span
													aria-hidden="true"
													className="text-text-muted text-xs"
												>
													›
												</span>
											) : null}
										</button>
									);
								})}
							</div>
						))
					)}
				</div>

				<div className="flex items-center gap-4 border-border-dim border-t px-3.5 py-2 text-[11px] text-text-faint">
					<span className="flex items-center gap-1.5">
						<Kbd>↑</Kbd>
						<Kbd>↓</Kbd>
						Navigate
					</span>
					<span className="flex items-center gap-1.5">
						<Kbd>↵</Kbd>
						Select
					</span>
					<span className="flex items-center gap-1.5">
						<Kbd>esc</Kbd>
						Close
					</span>
				</div>
			</div>
		</div>
	);
}

interface ShortcutsModalProps {
	onClose: () => void;
	open: boolean;
}

const SHORTCUT_GROUPS: { shortcuts: [string, string][]; title: string }[] = [
	{
		title: "Global",
		shortcuts: [
			["⌘ K", "Command palette"],
			["⌘ ?", "Keyboard shortcuts"],
			["⌘ N", "New post"],
		],
	},
	{
		title: "Editor",
		shortcuts: [
			["⌘ ⇧ V", "Preview post"],
			["⌘ ⇧ P", "Toggle publish"],
			["⌘ B", "Bold"],
			["⌘ I", "Italic"],
		],
	},
	{
		title: "Navigation",
		shortcuts: [
			["G P", "Go to Posts"],
			["G A", "Go to Analytics"],
			["G S", "Go to Settings"],
			["G H", "Go to Dashboard"],
			["esc", "Close / dismiss"],
		],
	},
];

export function ShortcutsModal({ onClose, open }: ShortcutsModalProps) {
	if (!open) {
		return null;
	}

	return (
		<div className="fixed inset-0 z-[9000] flex items-start justify-center px-4 pt-[18vh]">
			<button
				aria-label="Close keyboard shortcuts"
				className="absolute inset-0 bg-black/55 backdrop-blur-[6px]"
				onClick={onClose}
				type="button"
			/>

			<div
				aria-label="Keyboard shortcuts"
				className="relative w-full max-w-[440px] animate-palette-in overflow-hidden rounded-xl border border-border bg-sidebar-bg shadow-[0_32px_96px_rgba(0,0,0,0.8)]"
				role="dialog"
			>
				<div className="flex items-center justify-between border-border-subtle border-b px-4 py-3">
					<p className="font-semibold text-[13px] text-text-primary">
						Keyboard shortcuts
					</p>
					<button
						aria-label="Close"
						className="flex size-6 items-center justify-center rounded text-text-muted transition-colors hover:bg-white/[0.06] hover:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						onClick={onClose}
						type="button"
					>
						<IconX aria-hidden="true" className="size-3.5" />
					</button>
				</div>

				<div className="flex flex-col gap-4 px-4 py-4">
					{SHORTCUT_GROUPS.map((group) => (
						<div key={group.title}>
							<p className="pb-1.5 font-semibold text-[10px] text-text-faint uppercase tracking-[0.07em]">
								{group.title}
							</p>

							{group.shortcuts.map(([keys, label]) => (
								<div
									className="flex items-center justify-between border-border-dim border-b py-1.5 last:border-b-0"
									key={keys}
								>
									<span className="text-text-secondary text-xs">{label}</span>
									<span className="font-mono text-[11px] text-text-soft">
										{keys}
									</span>
								</div>
							))}
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
