import { useState } from "react";
import { Button } from "#/components/ui/button";
import { formatDate } from "#/lib/date";
import type { MediaItem } from "../media.types";
import { formatMediaSize } from "../media.utils";
import { MediaThumbnail } from "./upload-zone";

interface MediaDetailProps {
	color: string;
	item: MediaItem;
}

export function MediaDetail({ color, item }: MediaDetailProps) {
	const [copied, setCopied] = useState(false);

	async function copyUrl() {
		await navigator.clipboard.writeText(item.url);
		setCopied(true);
		window.setTimeout(() => setCopied(false), 1500);
	}

	return (
		<aside className="flex w-full shrink-0 flex-col overflow-y-auto border-border border-t bg-sidebar-bg lg:w-64 lg:border-t-0 lg:border-l">
			<MediaThumbnail
				className="h-[208px] w-full shrink-0"
				color={color}
				item={item}
			/>

			<div className="flex flex-1 flex-col p-3">
				<p className="truncate font-mono text-[11px] text-text-body">
					{item.name}
				</p>

				<dl className="mt-3">
					<DetailRow
						label="Type"
						value={item.kind === "video" ? "Video" : "Image"}
					/>
					<DetailRow label="Size" value={formatMediaSize(item.sizeKb)} />
					<DetailRow label="Dimensions" value={item.dims} />
					{item.duration ? (
						<DetailRow label="Duration" value={item.duration} />
					) : null}
					<DetailRow label="Uploaded" value={formatDate(item.uploadedAt)} />
				</dl>

				<p className="mt-4 font-medium text-[10px] text-text-dim uppercase tracking-[0.06em]">
					R2 URL
				</p>
				<p className="mt-1 break-all rounded border border-border bg-app-bg px-2 py-1.5 font-mono text-[10px] text-text-soft">
					{item.url}
				</p>

				<div className="mt-3 flex items-center gap-2">
					<Button
						onClick={() => void copyUrl()}
						size="sm"
						type="button"
						variant="outline"
					>
						{copied ? "Copied" : "Copy URL"}
					</Button>
					<Button
						disabled
						size="sm"
						title="Available when media storage is connected"
						type="button"
						variant="destructive"
					>
						Delete
					</Button>
				</div>
			</div>
		</aside>
	);
}

function DetailRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-center justify-between gap-3 py-1">
			<dt className="text-[11px] text-text-muted">{label}</dt>
			<dd className="truncate font-mono text-[11px] text-text-soft">{value}</dd>
		</div>
	);
}
