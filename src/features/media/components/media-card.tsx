import { cn } from "#/lib/utils";
import type { MediaItem } from "../media.types";
import { formatMediaSize } from "../media.utils";
import { MediaThumbnail, MediaTypeTag } from "./upload-zone";

interface MediaCardProps {
	color: string;
	item: MediaItem;
	onSelect: (itemId: number) => void;
	selected: boolean;
}

export function MediaCard({ color, item, onSelect, selected }: MediaCardProps) {
	return (
		<button
			className={cn(
				"group overflow-hidden rounded-lg border bg-flat-surface text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
				selected
					? "border-brand bg-brand/5"
					: "border-border hover:border-input",
			)}
			onClick={() => onSelect(item.id)}
			type="button"
		>
			<div className="relative">
				<MediaThumbnail
					className="aspect-video w-full"
					color={color}
					item={item}
				/>
				<span className="absolute top-2 left-2">
					<MediaTypeTag kind={item.kind} />
				</span>
				<span className="absolute right-2 bottom-2 rounded-[3px] bg-black/50 px-1.5 py-0.5 font-mono text-[10px] text-text-secondary">
					{item.duration ?? item.dims}
				</span>
			</div>

			<div className="px-2.5 py-2">
				<p className="truncate font-medium text-text-body text-xs">
					{item.name}
				</p>
				<p className="mt-0.5 text-[11px] text-text-muted">
					{formatMediaSize(item.sizeKb)}
				</p>
			</div>
		</button>
	);
}
