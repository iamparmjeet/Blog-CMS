import { IconCloud, IconSearch } from "@tabler/icons-react";
import { useState } from "react";
import { PageHeader, SegmentedControl } from "#/components/content-os/ui";
import { Input } from "#/components/ui/input";
import { MediaCard } from "../components/media-card";
import { MediaDetail } from "../components/media-detail";
import { UploadZone } from "../components/upload-zone";
import { validateMediaUpload } from "../functions/media-upload";
import {
	cancelMediaUpload,
	completeMediaUpload,
	initiateMediaUpload,
} from "../functions/media-upload.function";
import type { MediaFilter, MediaItem } from "../media.types";
import {
	filterMediaItems,
	formatMediaSize,
	getMediaItemColor,
} from "../media.utils";
import { generateMediaPreview } from "../media-preview";

type UploadStatus = "idle" | "uploading" | "success" | "error";

const FILTERS: { label: string; value: MediaFilter }[] = [
	{ label: "All", value: "all" },
	{ label: "Images", value: "images" },
	{ label: "Videos", value: "videos" },
];

export function MediaPage({ initialItems }: { initialItems: MediaItem[] }) {
	const [filter, setFilter] = useState<MediaFilter>("all");
	const [query, setQuery] = useState("");
	const [items, setItems] = useState(initialItems);
	const [selectedId, setSelectedId] = useState<number | null>(null);
	const [uploadMessage, setUploadMessage] = useState<string | null>(null);
	const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");

	const visibleItems = filterMediaItems(items, { filter, query });
	const selectedItem = items.find((item) => item.id === selectedId) ?? null;
	const totalKb = visibleItems.reduce((sum, item) => sum + item.sizeKb, 0);

	function removeItem(mediaId: number) {
		setItems((current) => current.filter((item) => item.id !== mediaId));
		setSelectedId((current) => (current === mediaId ? null : current));
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
			const source = await generateMediaPreview(file);
			const initiated = await initiateMediaUpload({
				data: {
					contentType: upload.contentType,
					durationSeconds: source.durationSeconds,
					fileName: upload.fileName,
					height: source.height,
					preview: source.preview
						? {
								contentType: source.preview.contentType,
								sizeBytes: source.preview.blob.size,
							}
						: undefined,
					sizeBytes: upload.sizeBytes,
					width: source.width,
				},
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

			if (initiated.previewUpload && source.preview) {
				const previewResponse = await fetch(initiated.previewUpload.uploadUrl, {
					body: source.preview.blob,
					headers: initiated.previewUpload.uploadHeaders,
					method: "PUT",
				});

				if (!previewResponse.ok) {
					throw new Error(
						`R2 rejected the preview upload with ${previewResponse.status}`,
					);
				}
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
				meta={
					visibleItems.length === items.length
						? `${items.length} files · ${formatMediaSize(totalKb)}`
						: `${visibleItems.length} of ${items.length} files · ${formatMediaSize(totalKb)}`
				}
				title="Media"
			>
				<div className="relative">
					<IconSearch
						aria-hidden="true"
						className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-text-dim"
					/>
					<Input
						aria-label="Search media"
						className="w-36 pl-7 sm:w-44"
						onChange={(event) => setQuery(event.target.value)}
						placeholder="Search files..."
						type="search"
						value={query}
					/>
				</div>

				<SegmentedControl
					onChange={setFilter}
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
							{query.trim()
								? "No assets match your search."
								: "No assets in this view yet."}
						</p>
					) : (
						<div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
							{visibleItems.map((item) => (
								<MediaCard
									color={getMediaItemColor(items, item)}
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
						color={getMediaItemColor(items, selectedItem)}
						item={selectedItem}
						onDeleted={removeItem}
					/>
				) : null}
			</div>
		</main>
	);
}
