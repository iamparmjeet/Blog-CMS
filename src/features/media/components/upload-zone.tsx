import { IconPhoto, IconUpload, IconVideo } from "@tabler/icons-react";
import { useId, useRef, useState } from "react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { cn, hexToRgba } from "#/lib/utils";
import type { MediaItem } from "../media.types";

type UploadStatus = "idle" | "uploading" | "success" | "error";

interface UploadZoneProps {
	message: string | null;
	onUpload: (file: File) => Promise<void>;
	status: UploadStatus;
}

export function UploadZone({ message, onUpload, status }: UploadZoneProps) {
	const inputId = useId();
	const inputRef = useRef<HTMLInputElement>(null);
	const isUploading = status === "uploading";

	function selectFile(files: FileList | null) {
		if (isUploading) return;

		const [file] = files ?? [];

		if (file) {
			void onUpload(file);
		}
	}

	function openFilePicker() {
		if (!isUploading) {
			inputRef.current?.click();
		}
	}

	return (
		<div>
			<Input
				accept="image/gif,image/jpeg,image/png,image/webp,video/mp4,video/webm"
				className="sr-only"
				disabled={isUploading}
				id={inputId}
				onChange={(event) => {
					selectFile(event.target.files);
					event.target.value = "";
				}}
				ref={inputRef}
				type="file"
			/>

			<Button
				aria-busy={isUploading}
				aria-controls={inputId}
				className="flex h-auto w-full flex-col items-center justify-center rounded-xl border-[1.5px] border-border border-dashed bg-flat-surface px-5 py-9 text-center transition-colors hover:border-brand/50 hover:bg-brand/[0.03] disabled:cursor-not-allowed disabled:opacity-70"
				disabled={isUploading}
				onClick={openFilePicker}
				onDragOver={(event) => {
					event.preventDefault();
				}}
				onDrop={(event) => {
					event.preventDefault();
					selectFile(event.dataTransfer.files);
				}}
				type="button"
				variant="outline"
			>
				<IconUpload aria-hidden="true" className="size-5 text-text-dim" />

				<span className="mt-2.5 font-medium text-[13px] text-text-body">
					{isUploading
						? "Uploading to R2..."
						: "Drop a file here or click to browse"}
				</span>

				<span className="mt-1 text-[11px] text-text-muted">
					JPG · PNG · WebP · GIF · MP4 · WebM · max 50 MB
				</span>

				<span className="mt-2 text-[10px] text-text-faint">
					Uploaded directly to Cloudflare R2
				</span>
			</Button>

			<p
				aria-live="polite"
				className={cn(
					"mt-2 min-h-4 text-[11px]",
					status === "error" ? "text-danger" : "text-text-muted",
				)}
			>
				{message}
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
	const [stage, setStage] = useState<"variant" | "original" | "failed">(
		"variant",
	);
	const hasPreview = Boolean(item.previewUrl);
	const activeUrl =
		stage === "variant" ? (item.previewUrl ?? item.url) : item.url;
	const hasFailed = stage === "failed";

	function handleError() {
		if (stage === "variant" && hasPreview) {
			setStage("original");
			return;
		}

		setStage("failed");
	}

	return (
		<div
			className={cn("flex items-center justify-center", className)}
			style={{
				background: `linear-gradient(135deg, ${hexToRgba(color, 0.18)} 0%, ${hexToRgba(color, 0.08)} 100%)`,
			}}
		>
			{hasFailed ? (
				item.kind === "video" ? (
					<IconVideo aria-hidden="true" className="size-6 text-white/35" />
				) : (
					<IconPhoto aria-hidden="true" className="size-6 text-white/35" />
				)
			) : item.kind === "video" && !hasPreview ? (
				<video
					className="size-full object-cover"
					muted
					onError={handleError}
					playsInline
					preload="metadata"
					src={activeUrl}
				/>
			) : (
				<img
					alt={item.name}
					className="size-full object-cover"
					decoding="async"
					loading="lazy"
					onError={handleError}
					src={activeUrl}
				/>
			)}
		</div>
	);
}
