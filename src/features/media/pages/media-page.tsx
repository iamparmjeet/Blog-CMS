import { IconCloud } from "@tabler/icons-react";
import { useState } from "react";
import { PageHeader, SegmentedControl } from "#/components/content-os/ui";
import { MediaCard } from "../components/media-card";
import { MediaDetail } from "../components/media-detail";
import { UploadZone } from "../components/upload-zone";
import { validateMediaUpload } from "../functions/media-upload";
import {
	cancelMediaUpload,
	completeMediaUpload,
	initiateMediaUpload,
} from "../functions/media-upload.function";
import { THUMBNAIL_COLORS } from "../media.data";
import type { MediaFilter, MediaItem } from "../media.types";
import { formatMediaSize } from "../media.utils";

type UploadStatus = "idle" | "uploading" | "success" | "error";

const FILTERS: { label: string; value: MediaFilter }[] = [
	{ label: "All", value: "all" },
	{ label: "Images", value: "images" },
	{ label: "Videos", value: "videos" },
];

function getItemColor(items: MediaItem[], item: MediaItem): string {
	const index = items.findIndex((entry) => entry.id === item.id);

	return THUMBNAIL_COLORS[index % THUMBNAIL_COLORS.length] ?? "#7c3aed";
}

export function MediaPage({ initialItems }: { initialItems: MediaItem[] }) {
	const [filter, setFilter] = useState<MediaFilter>("all");
	const [items, setItems] = useState(initialItems);
	const [selectedId, setSelectedId] = useState<number | null>(null);
	const [uploadMessage, setUploadMessage] = useState<string | null>(null);
	const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");

	const visibleItems = getVisibleItems(filter, items);
	const selectedItem = items.find((item) => item.id === selectedId) ?? null;
	const totalKb = items.reduce((sum, item) => sum + item.sizeKb, 0);

	function changeFilter(nextFilter: MediaFilter) {
		setFilter(nextFilter);

		const nextVisibleItems = getVisibleItems(nextFilter, items);

		if (!nextVisibleItems.some((item) => item.id === selectedId)) {
			setSelectedId(null);
		}
	}

	async function uploadFile(file: File) {
		let pendingMediaId: number | null = null;

		setUploadStatus("uploading");
		setUploadMessage(`Uploading ${file.name}`);

		try {
			const upload = validateMediaUpload({
				contentType: file.type,
				fileName: file.name,
				sizeBytes: file.size,
			});
			const initiated = await initiateMediaUpload({
				data: upload,
			});

			pendingMediaId = initiated.mediaId;

			const uploadResponse = await fetch(initiated.uploadUrl, {
				body: file,
				headers: initiated.uploadHeaders,
				method: "PUT",
			});

			if (!uploadResponse.ok) {
				throw new Error(`R2 rejected the upload with ${uploadResponse.status}`);
			}

			const completed = await completeMediaUpload({
				data: {
					mediaId: initiated.mediaId,
				},
			});

			setUploadStatus("success");
			setUploadMessage(`${completed.name} uploaded successfully`);
			setItems((current) => [
				completed,
				...current.filter((item) => item.id !== completed.id),
			]);
		} catch (error) {
			if (pendingMediaId !== null) {
				try {
					await cancelMediaUpload({
						data: {
							mediaId: pendingMediaId,
						},
					});
				} catch {
					setUploadMessage(
						"Upload failed and its pending record could not be cleaned up",
					);
					setUploadStatus("error");
					return;
				}
			}

			setUploadStatus("error");
			setUploadMessage(
				error instanceof Error ? error.message : "Could not upload this file",
			);
		}
	}

	return (
		<main className="flex h-full min-h-0 flex-col">
			<PageHeader
				meta={`${items.length} files · ${formatMediaSize(totalKb)}`}
				title="Media"
			>
				<SegmentedControl
					onChange={changeFilter}
					options={FILTERS}
					value={filter}
				/>

				<span className="flex items-center gap-1.5 rounded border border-border bg-flat-surface px-2 py-1 text-[11px] text-text-secondary">
					<IconCloud aria-hidden="true" className="size-3.5" />
					Cloudflare R2
				</span>
			</PageHeader>

			<div className="flex min-h-0 flex-1 flex-col lg:flex-row">
				<div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
					<UploadZone
						message={uploadMessage}
						onUpload={uploadFile}
						status={uploadStatus}
					/>

					{visibleItems.length === 0 ? (
						<p className="mt-10 text-center text-text-muted text-xs">
							No assets in this view yet.
						</p>
					) : (
						<div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
							{visibleItems.map((item) => (
								<MediaCard
									color={getItemColor(items, item)}
									item={item}
									key={item.id}
									onSelect={(itemId) =>
										setSelectedId((current) =>
											current === itemId ? null : itemId,
										)
									}
									selected={item.id === selectedId}
								/>
							))}
						</div>
					)}
				</div>

				{selectedItem ? (
					<MediaDetail
						color={getItemColor(items, selectedItem)}
						item={selectedItem}
					/>
				) : null}
			</div>
		</main>
	);
}

function getVisibleItems(filter: MediaFilter, items: MediaItem[]): MediaItem[] {
	if (filter === "images") {
		return items.filter((item) => item.kind === "image");
	}

	if (filter === "videos") {
		return items.filter((item) => item.kind === "video");
	}

	return items;
}
