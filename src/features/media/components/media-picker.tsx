import { IconPhoto, IconSearch, IconX } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { listMedia } from "../functions/media-list.function";
import type { MediaItem } from "../media.types";
import { filterMediaItems, getMediaItemColor } from "../media.utils";
import { MediaThumbnail, MediaTypeTag } from "./upload-zone";

interface MediaPickerProps {
	onClose: () => void;
	onSelect: (item: MediaItem) => void;
}

export function MediaPicker({ onClose, onSelect }: MediaPickerProps) {
	const [items, setItems] = useState<MediaItem[] | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [query, setQuery] = useState("");

	useEffect(() => {
		let cancelled = false;

		listMedia()
			.then((loaded) => {
				if (!cancelled) {
					setItems(loaded);
				}
			})
			.catch(() => {
				if (!cancelled) {
					setError("Could not load your media library");
				}
			});

		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") {
				onClose();
			}
		}

		window.addEventListener("keydown", handleKeyDown);

		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [onClose]);

	const visibleItems = filterMediaItems(items ?? [], { filter: "all", query });

	return (
		<div
			aria-label="Insert media"
			aria-modal="true"
			className="fixed inset-0 z-[8500] flex items-center justify-center bg-black/55 p-4"
			role="dialog"
		>
			<div className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-sidebar-bg shadow-2xl">
				<div className="flex items-center justify-between gap-3 border-border border-b px-4 py-3">
					<div className="flex items-center gap-2">
						<IconPhoto aria-hidden="true" className="size-4 text-brand" />
						<h2 className="font-semibold text-sm text-text-body">
							Insert media
						</h2>
					</div>
					<Button
						aria-label="Close media picker"
						onClick={onClose}
						size="icon-sm"
						type="button"
						variant="ghost"
					>
						<IconX aria-hidden="true" />
					</Button>
				</div>

				<div className="border-border border-b px-4 py-3">
					<div className="relative">
						<IconSearch
							aria-hidden="true"
							className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-text-dim"
						/>
						<Input
							aria-label="Search media library"
							autoFocus
							className="pl-7"
							onChange={(event) => setQuery(event.target.value)}
							placeholder="Search your media..."
							type="search"
							value={query}
						/>
					</div>
				</div>

				<div className="min-h-0 flex-1 overflow-y-auto p-4">
					{error ? (
						<p className="py-8 text-center text-danger text-xs" role="alert">
							{error}
						</p>
					) : items === null ? (
						<p className="py-8 text-center text-text-muted text-xs">
							Loading media...
						</p>
					) : visibleItems.length === 0 ? (
						<p className="py-8 text-center text-text-muted text-xs">
							{query.trim()
								? "No assets match your search."
								: "No media yet. Upload files from the Media page."}
						</p>
					) : (
						<div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
							{visibleItems.map((item) => (
								<button
									className="group overflow-hidden rounded-lg border border-border bg-flat-surface text-left transition-colors hover:border-brand/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
									key={item.id}
									onClick={() => onSelect(item)}
									type="button"
								>
									<div className="relative">
										<MediaThumbnail
											className="aspect-video w-full"
											color={getMediaItemColor(visibleItems, item)}
											item={item}
										/>
										<span className="absolute top-2 left-2">
											<MediaTypeTag kind={item.kind} />
										</span>
									</div>
									<div className="px-2.5 py-2">
										<p className="truncate font-medium text-text-body text-xs">
											{item.name}
										</p>
									</div>
								</button>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
