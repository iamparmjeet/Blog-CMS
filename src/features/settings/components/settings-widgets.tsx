import { IconCheck } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { AccentSwitch, SegmentedControl } from "#/components/content-os/ui";
import { Button } from "#/components/ui/button";
import { cn } from "#/lib/utils";
import { ACCENT_SWATCHES, type ThemeMode } from "../settings.types";

export function SettingsSection({
	children,
	description,
	title,
}: {
	children: React.ReactNode;
	description?: string;
	title: string;
}) {
	return (
		<section>
			<h2 className="font-semibold text-[13px] text-text-body">{title}</h2>
			{description ? (
				<p className="mt-1 text-[11px] text-text-muted">{description}</p>
			) : null}
			<div className="mt-2.5 flex flex-col gap-4 border-border border-t pt-4">
				{children}
			</div>
		</section>
	);
}

export function SettingsInput({
	description,
	label,
	mono,
	...props
}: React.ComponentProps<"input"> & {
	description?: string;
	label: string;
	mono?: boolean;
}) {
	return (
		<label className="flex flex-col gap-1.5">
			<span className="font-medium text-text-secondary text-xs">{label}</span>
			<input
				className={cn(
					"rounded-md border border-border bg-app-bg px-3 py-1.5 text-[13px] text-text-body outline-none transition-colors placeholder:text-text-ghost focus:border-text-dim",
					mono && "font-mono text-xs",
				)}
				{...props}
			/>
			{description ? (
				<span className="text-[11px] text-text-muted">{description}</span>
			) : null}
		</label>
	);
}

export function SettingsTextarea({
	description,
	label,
	...props
}: React.ComponentProps<"textarea"> & {
	description?: string;
	label: string;
}) {
	return (
		<label className="flex flex-col gap-1.5">
			<span className="font-medium text-text-secondary text-xs">{label}</span>
			<textarea
				className="min-h-20 resize-y rounded-md border border-border bg-app-bg px-3 py-2 text-[13px] text-text-body leading-relaxed outline-none transition-colors placeholder:text-text-ghost focus:border-text-dim"
				{...props}
			/>
			{description ? (
				<span className="text-[11px] text-text-muted">{description}</span>
			) : null}
		</label>
	);
}

export function SettingsToggleRow({
	checked,
	description,
	label,
	onChange,
}: {
	checked: boolean;
	description: string;
	label: string;
	onChange: (checked: boolean) => void;
}) {
	return (
		<div className="flex items-start justify-between gap-6">
			<div>
				<p className="font-medium text-[13px] text-text-body">{label}</p>
				<p className="mt-0.5 text-[11px] text-text-muted">{description}</p>
			</div>
			<AccentSwitch checked={checked} onChange={onChange} />
		</div>
	);
}

const THEME_OPTIONS: readonly { label: string; value: ThemeMode }[] = [
	{ label: "System", value: "system" },
	{ label: "Day", value: "day" },
	{ label: "Night", value: "night" },
];

export function ThemeModeControl({
	onChange,
	value,
}: {
	onChange: (value: ThemeMode) => void;
	value: ThemeMode;
}) {
	return (
		<div className="flex flex-col gap-1.5">
			<span className="font-medium text-text-secondary text-xs">Theme</span>
			<SegmentedControl
				ariaLabel="Theme mode"
				onChange={onChange}
				options={THEME_OPTIONS}
				value={value}
			/>
		</div>
	);
}

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;
const DEFAULT_SURFACE_TINT = "#7c3aed";

export function SurfaceTintPicker({
	onChange,
	value,
}: {
	onChange: (value: string) => void;
	value: string;
}) {
	// Local draft lets the hex field accept partial input (e.g. "#f43");
	// only complete values propagate, and blur snaps back to the last one.
	const [draft, setDraft] = useState(value);

	useEffect(() => {
		setDraft(value);
	}, [value]);

	return (
		<div className="flex flex-col gap-1.5">
			<span className="font-medium text-text-secondary text-xs">
				Card surfaces
			</span>
			<div className="flex gap-2">
				<Button
					aria-pressed={!value}
					onClick={() => onChange("")}
					size="sm"
					type="button"
					variant={!value ? "default" : "outline"}
				>
					Plain
				</Button>
				<Button
					aria-pressed={Boolean(value)}
					onClick={() => onChange(value || DEFAULT_SURFACE_TINT)}
					size="sm"
					type="button"
					variant={value ? "default" : "outline"}
				>
					Tinted
				</Button>
			</div>
			{value ? (
				<div className="flex items-center gap-2">
					<input
						aria-label="Surface tint color"
						className="size-8 shrink-0 cursor-pointer rounded-md border border-border bg-transparent p-0.5"
						onChange={(event) => onChange(event.target.value)}
						type="color"
						value={value}
					/>
					<input
						aria-label="Surface tint hex"
						className="w-28 rounded-md border border-border bg-app-bg px-2 py-1.5 font-mono text-text-body text-xs outline-none transition-colors placeholder:text-text-ghost focus:border-text-dim"
						inputMode="text"
						maxLength={7}
						onBlur={() => {
							if (
								draft !== value &&
								!(draft === "" || HEX_PATTERN.test(draft))
							) {
								setDraft(value);
							}
						}}
						onChange={(event) => {
							const next = event.target.value;
							setDraft(next);
							if (HEX_PATTERN.test(next)) {
								onChange(next);
							}
						}}
						placeholder="#rrggbb"
						value={draft}
					/>
				</div>
			) : null}
			<span className="text-[11px] text-text-muted">
				{value
					? "Optional wash applied to flat dashboard surfaces."
					: "Cards use the default background with no color wash."}
			</span>
		</div>
	);
}

export function AccentPicker({
	onChange,
	value,
}: {
	onChange: (value: string) => void;
	value: string;
}) {
	return (
		<div className="flex flex-wrap gap-2">
			{ACCENT_SWATCHES.map((color) => (
				<button
					aria-label={`Use accent ${color}`}
					aria-pressed={color === value}
					className={cn(
						"flex size-8 items-center justify-center rounded-md border transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
						color === value ? "border-white/40" : "border-transparent",
					)}
					key={color}
					onClick={() => onChange(color)}
					style={{ background: color }}
					type="button"
				>
					{color === value ? (
						<IconCheck aria-hidden="true" className="size-4 text-white" />
					) : null}
				</button>
			))}
		</div>
	);
}

export function IntegrationRow({
	description,
	name,
	tone,
}: {
	description: string;
	name: string;
	tone: "connected" | "disconnected";
}) {
	return (
		<div className="flex items-center justify-between gap-4 rounded-md border border-border px-3 py-2.5">
			<div className="min-w-0">
				<p className="font-medium text-[13px] text-text-body">{name}</p>
				<p className="mt-0.5 truncate text-[11px] text-text-muted">
					{description}
				</p>
			</div>
			<span
				className={cn(
					"shrink-0 rounded-full px-2 py-0.5 font-medium text-[10px]",
					tone === "connected"
						? "bg-success/10 text-success"
						: "bg-text-soft/10 text-text-soft",
				)}
			>
				{tone === "connected" ? "Connected" : "Not connected"}
			</span>
		</div>
	);
}

export function EndpointRow({ label, url }: { label: string; url: string }) {
	const [copied, setCopied] = useState(false);

	async function copy() {
		await navigator.clipboard.writeText(url);
		setCopied(true);
		window.setTimeout(() => setCopied(false), 1500);
	}

	return (
		<div className="flex items-center gap-2 rounded-md border border-border bg-app-bg px-3 py-2">
			<div className="min-w-0 flex-1">
				<p className="text-[10px] text-text-muted uppercase tracking-[0.06em]">
					{label}
				</p>
				<p className="mt-0.5 truncate font-mono text-[11px] text-text-soft">
					{url}
				</p>
			</div>
			<Button
				onClick={() => void copy()}
				size="sm"
				type="button"
				variant="outline"
			>
				{copied ? "Copied" : "Copy"}
			</Button>
		</div>
	);
}
