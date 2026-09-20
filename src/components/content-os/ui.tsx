import {
	AvatarFallback,
	AvatarImage,
	Avatar as AvatarRoot,
} from "#/components/ui/avatar";
import { Switch } from "#/components/ui/switch";
import { cn } from "#/lib/utils";

export type ContentStatus = "draft" | "published" | "scheduled" | "archived";

const STATUS_STYLES: Record<
	ContentStatus,
	{ label: string; className: string }
> = {
	archived: {
		label: "Archived",
		className: "bg-text-secondary/10 text-text-secondary",
	},
	draft: { label: "Draft", className: "bg-text-soft/10 text-text-soft" },
	published: { label: "Published", className: "bg-success/10 text-success" },
	scheduled: { label: "Scheduled", className: "bg-warning/10 text-warning" },
};

export function StatusBadge({
	status,
	className,
}: {
	status: ContentStatus;
	className?: string;
}) {
	const style = STATUS_STYLES[status];

	return (
		<span
			className={cn(
				"inline-flex w-fit items-center gap-1.5 rounded px-2 py-0.5 font-medium text-xs",
				style.className,
				className,
			)}
		>
			<span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
			{style.label}
		</span>
	);
}

export function Kbd({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<kbd
			className={cn(
				"inline-flex h-[18px] min-w-[18px] items-center justify-center rounded border border-input bg-card px-1 font-mono text-[10px] text-text-muted",
				className,
			)}
		>
			{children}
		</kbd>
	);
}

export function SectionLabel({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<p
			className={cn(
				"font-medium text-[11px] text-text-muted uppercase tracking-[0.04em]",
				className,
			)}
		>
			{children}
		</p>
	);
}

export interface SegmentedOption<TValue extends string> {
	label: React.ReactNode;
	value: TValue;
}

export function SegmentedControl<TValue extends string>({
	value,
	options,
	onChange,
	className,
}: {
	value: TValue;
	options: readonly SegmentedOption<TValue>[];
	onChange: (value: TValue) => void;
	className?: string;
}) {
	return (
		<div
			aria-label="View options"
			className={cn(
				"inline-flex items-center gap-0.5 rounded-md border border-border bg-card p-0.5",
				className,
			)}
			role="tablist"
		>
			{options.map((option) => {
				const isActive = option.value === value;

				return (
					<button
						aria-selected={isActive}
						className={cn(
							"rounded px-2.5 py-1 font-medium text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
							isActive
								? "bg-muted text-text-body"
								: "text-text-muted hover:text-text-secondary",
						)}
						key={option.value}
						onClick={() => onChange(option.value)}
						role="tab"
						type="button"
					>
						{option.label}
					</button>
				);
			})}
		</div>
	);
}

export function UserAvatar({
	name,
	image,
	className,
}: {
	name: string;
	image?: string | null;
	className?: string;
}) {
	const initials =
		name
			.trim()
			.split(/\s+/)
			.slice(0, 2)
			.map((part) => part.charAt(0))
			.join("")
			.toUpperCase() || "U";

	return (
		<AvatarRoot className={cn("size-7", className)}>
			<AvatarImage alt="" src={image ?? undefined} />
			<AvatarFallback className="bg-linear-to-br from-brand to-indigo-600 font-semibold text-[11px] text-white">
				{initials}
			</AvatarFallback>
		</AvatarRoot>
	);
}

export function AccentSwitch({
	checked,
	onChange,
	accentColor,
	className,
}: {
	checked: boolean;
	onChange: (checked: boolean) => void;
	accentColor?: string;
	className?: string;
}) {
	return (
		<Switch
			checked={checked}
			className={cn("data-checked:bg-brand", className)}
			onCheckedChange={onChange}
			style={
				accentColor && checked ? { backgroundColor: accentColor } : undefined
			}
		/>
	);
}

export function PageHeader({
	title,
	meta,
	children,
	className,
}: {
	title: string;
	meta?: React.ReactNode;
	children?: React.ReactNode;
	className?: string;
}) {
	return (
		<header
			className={cn(
				"flex shrink-0 items-center justify-between gap-4 border-border border-b px-8 py-3.5",
				className,
			)}
		>
			<div className="flex min-w-0 items-baseline gap-3">
				<h1 className="font-semibold text-[15px] text-text-primary tracking-[-0.01em]">
					{title}
				</h1>
				{meta ? (
					<span className="truncate text-text-muted text-xs">{meta}</span>
				) : null}
			</div>

			{children ? (
				<div className="flex shrink-0 items-center gap-2">{children}</div>
			) : null}
		</header>
	);
}

export function EmptyState({
	icon,
	title,
	description,
	action,
	className,
}: {
	icon: React.ReactNode;
	title: string;
	description: string;
	action?: React.ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"flex flex-col items-center justify-center px-6 py-20 text-center",
				className,
			)}
		>
			<div className="flex size-12 items-center justify-center rounded-[10px] border border-border bg-card text-text-dim">
				{icon}
			</div>
			<p className="mt-4 font-medium text-sm text-text-primary">{title}</p>
			<p className="mt-1 max-w-[38ch] text-text-muted text-xs leading-relaxed">
				{description}
			</p>
			{action ? <div className="mt-4">{action}</div> : null}
		</div>
	);
}
