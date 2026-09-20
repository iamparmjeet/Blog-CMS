import { IconCloud } from "@tabler/icons-react";
import { useState } from "react";
import { PageHeader, SegmentedControl } from "#/components/content-os/ui";
import { MediaCard } from "../components/media-card";
import { MediaDetail } from "../components/media-detail";
import { UploadZone } from "../components/upload-zone";
import { DEMO_MEDIA_ITEMS, THUMBNAIL_COLORS } from "../media.data";
import type { MediaFilter, MediaItem } from "../media.types";
import { formatMediaSize } from "../media.utils";

const FILTERS: { label: string; value: MediaFilter }[] = [
	{ label: "All", value: "all" },
	{ label: "Images", value: "images" },
	{ label: "Videos", value: "videos" },
];

const items = DEMO_MEDIA_ITEMS;

function getItemColor(item: MediaItem): string {
	const index = items.findIndex((entry) => entry.id === item.id);

	return THUMBNAIL_COLORS[index % THUMBNAIL_COLORS.length] ?? "#7c3aed";
}

export function MediaPage() {
	const [filter, setFilter] = useState<MediaFilter>("all");
	const [selectedId, setSelectedId] = useState<number | null>(null);

	const visibleItems = getVisibleItems(filter);
	const selectedItem = items.find((item) => item.id === selectedId) ?? null;
	const totalKb = items.reduce((sum, item) => sum + item.sizeKb, 0);

	function changeFilter(nextFilter: MediaFilter) {
		setFilter(nextFilter);

		const nextVisibleItems = getVisibleItems(nextFilter);

		if (!nextVisibleItems.some((item) => item.id === selectedId)) {
			setSelectedId(null);
		}
	}

	return (
		<main className="flex h-full min-h-0 flex-col">
			<PageHeader
				meta={`${items.length} files · ${formatMediaSize(totalKb)} · sample assets`}
				title="Media"
			>
				<SegmentedControl
					onChange={changeFilter}
					options={FILTERS}
					value={filter}
				/>
				<span className="flex items-center gap-1.5 rounded border border-border bg-card px-2 py-1 text-[11px] text-text-secondary">
					<IconCloud aria-hidden="true" className="size-3.5" />
					Cloudflare R2
				</span>
			</PageHeader>

			<div className="flex min-h-0 flex-1">
				<div className="min-h-0 flex-1 overflow-y-auto p-8">
					<UploadZone />

					{visibleItems.length === 0 ? (
						<p className="mt-10 text-center text-text-muted text-xs">
							No assets in this view yet.
						</p>
					) : (
						<div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
							{visibleItems.map((item) => (
								<MediaCard
									color={getItemColor(item)}
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
					<MediaDetail color={getItemColor(selectedItem)} item={selectedItem} />
				) : null}
			</div>
		</main>
	);
}

function getVisibleItems(filter: MediaFilter): MediaItem[] {
	if (filter === "images") {
		return items.filter((item) => item.kind === "image");
	}

	if (filter === "videos") {
		return items.filter((item) => item.kind === "video");
	}

	return items;
}
