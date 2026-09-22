import { IconAlertTriangle } from "@tabler/icons-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { formatDate } from "#/lib/date";
import {
	isBlockingMediaUsage,
	type MediaUsageReference,
} from "../functions/media-usage";
import { deleteMedia, getMediaUsage } from "../functions/media-usage.function";
import type { MediaItem } from "../media.types";
import { formatMediaSize } from "../media.utils";
import { MediaThumbnail } from "./upload-zone";

interface MediaDetailProps {
	color: string;
	item: MediaItem;
	onDeleted: (mediaId: number) => void;
}

type DeleteState =
	| { kind: "idle" }
	| { kind: "busy" }
	| { kind: "blocked"; references: MediaUsageReference[] }
	| { kind: "confirm"; references: MediaUsageReference[] }
	| { kind: "error"; message: string };

export function MediaDetail({ color, item, onDeleted }: MediaDetailProps) {
	const [copied, setCopied] = useState(false);
	const [deleteState, setDeleteState] = useState<DeleteState>({ kind: "idle" });
	const isDeleteBusy = deleteState.kind === "busy";

	async function copyUrl() {
		await navigator.clipboard.writeText(item.url);
		setCopied(true);
		window.setTimeout(() => setCopied(false), 1500);
	}

	async function requestDelete() {
		setDeleteState({ kind: "busy" });

		try {
			const references = await getMediaUsage({
				data: { mediaId: item.id },
			});
			const blocking = references.filter(isBlockingMediaUsage);

			if (blocking.length > 0) {
				setDeleteState({ kind: "blocked", references: blocking });
				return;
			}

			if (references.length > 0) {
				setDeleteState({ kind: "confirm", references });
				return;
			}

			if (!window.confirm(`Delete ${item.name} permanently?`)) {
				setDeleteState({ kind: "idle" });
				return;
			}

			await performDelete(false);
		} catch (error) {
			setDeleteState({
				kind: "error",
				message:
					error instanceof Error
						? error.message
						: "Could not check where this media is used",
			});
		}
	}

	async function performDelete(acknowledgeUsage: boolean) {
		setDeleteState({ kind: "busy" });

		try {
			await deleteMedia({
				data: { acknowledgeUsage, mediaId: item.id },
			});
			onDeleted(item.id);
		} catch (error) {
			setDeleteState({
				kind: "error",
				message:
					error instanceof Error ? error.message : "Could not delete this file",
			});
		}
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
					<DetailRow label="Dimensions" value={item.dims || "—"} />
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

				{deleteState.kind === "blocked" ? (
					<DeleteNotice tone="blocked" references={deleteState.references} />
				) : null}

				{deleteState.kind === "confirm" ? (
					<div className="mt-3 rounded-lg border border-warning/40 bg-warning/5 p-2.5">
						<p className="flex items-center gap-1.5 font-medium text-warning text-xs">
							<IconAlertTriangle aria-hidden="true" className="size-3.5" />
							Still referenced
						</p>
						<ul className="mt-1.5 flex flex-col gap-0.5 text-[11px] text-text-muted">
							{deleteState.references.map((reference) => (
								<li className="truncate" key={reference.postId}>
									{reference.title || "Untitled"}
									{reference.trashed ? " (trash)" : ""}
								</li>
							))}
						</ul>
						<div className="mt-2.5 flex items-center gap-2">
							<Button
								disabled={isDeleteBusy}
								size="sm"
								type="button"
								variant="destructive"
								onClick={() => void performDelete(true)}
							>
								Delete anyway
							</Button>
							<Button
								size="sm"
								type="button"
								variant="ghost"
								onClick={() => setDeleteState({ kind: "idle" })}
							>
								Cancel
							</Button>
						</div>
					</div>
				) : null}

				{deleteState.kind === "error" ? (
					<p
						className="mt-3 rounded-lg border border-danger/40 bg-danger/5 p-2.5 text-danger text-xs"
						role="alert"
					>
						{deleteState.message}
					</p>
				) : null}

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
						disabled={isDeleteBusy}
						size="sm"
						type="button"
						variant="destructive"
						onClick={() => void requestDelete()}
					>
						{isDeleteBusy ? "Checking..." : "Delete"}
					</Button>
				</div>
			</div>
		</aside>
	);
}

function DeleteNotice({
	references,
	tone,
}: {
	references: MediaUsageReference[];
	tone: "blocked";
}) {
	return (
		<div
			className="mt-3 rounded-lg border border-danger/40 bg-danger/5 p-2.5"
			role="alert"
		>
			<p className="flex items-center gap-1.5 font-medium text-danger text-xs">
				<IconAlertTriangle aria-hidden="true" className="size-3.5" />
				{tone === "blocked" ? "Used in published posts" : "In use"}
			</p>
			<p className="mt-1 text-[11px] text-text-muted">
				Remove it from these posts before deleting:
			</p>
			<ul className="mt-1.5 flex flex-col gap-0.5 text-[11px] text-text-muted">
				{references.map((reference) => (
					<li className="truncate" key={reference.postId}>
						{reference.title || "Untitled"}
					</li>
				))}
			</ul>
		</div>
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
