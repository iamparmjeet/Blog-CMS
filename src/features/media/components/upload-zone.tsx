import { IconPhoto, IconUpload, IconVideo } from "@tabler/icons-react";
import { cn, hexToRgba } from "#/lib/utils";
import type { MediaItem } from "../media.types";

export function UploadZone() {
	return (
		<div className="flex flex-col items-center justify-center rounded-lg border-[1.5px] border-border border-dashed px-5 py-7 text-center">
			<IconUpload aria-hidden="true" className="size-5 text-text-dim" />
			<p className="mt-2.5 font-medium text-[13px] text-text-body">
				Drop files here or click to browse
			</p>
			<p className="mt-1 text-[11px] text-text-muted">
				JPG · PNG · WebP · GIF · MP4 · WebM · max 50 MB
			</p>
			<p className="mt-2 text-[10px] text-text-faint">
				Stored in Cloudflare R2 · uploads connect with the media milestone
			</p>
		</div>
	);
}

export function MediaTypeTag({ kind }: { kind: MediaItem["kind"] }) {
	const isVideo = kind === "video";

	return (
		<span
			className={cn(
				"rounded-[3px] px-1.5 py-0.5 font-medium text-[9px] uppercase tracking-[0.06em]",
				isVideo
					? "bg-danger/10 text-[#f87171]"
					: "bg-brand/10 text-accent-soft",
			)}
		>
			{isVideo ? "Video" : "Image"}
		</span>
	);
}

export function MediaThumbnail({
	className,
	color,
	item,
}: {
	className?: string;
	color: string;
	item: MediaItem;
}) {
	return (
		<div
			className={cn("flex items-center justify-center", className)}
			style={{
				background: `linear-gradient(135deg, ${hexToRgba(color, 0.18)} 0%, ${hexToRgba(color, 0.08)} 100%)`,
			}}
		>
			{item.kind === "video" ? (
				<IconVideo aria-hidden="true" className="size-6 text-white/35" />
			) : (
				<IconPhoto aria-hidden="true" className="size-6 text-white/35" />
			)}
		</div>
	);
}
