import { IconCheck } from "@tabler/icons-react";
import { useState } from "react";
import { AccentSwitch } from "#/components/content-os/ui";
import { Button } from "#/components/ui/button";
import { cn } from "#/lib/utils";
import { ACCENT_SWATCHES } from "../settings.types";

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
