import type { AllowedMediaPreviewContentType } from "./media.types";

export const PREVIEW_MAX_DIMENSION = 640;
const PREVIEW_QUALITY = 0.82;
const VIDEO_SEEK_TIMEOUT_MS = 8_000;

export interface GeneratedMediaPreview {
	blob: Blob;
	contentType: AllowedMediaPreviewContentType;
}

export interface GeneratedMediaSource {
	durationSeconds?: number;
	height?: number;
	preview: GeneratedMediaPreview | null;
	width?: number;
}

export function computePreviewDimensions(
	width: number,
	height: number,
	maxDimension: number = PREVIEW_MAX_DIMENSION,
): { height: number; width: number } {
	if (width <= 0 || height <= 0) {
		return { height: 1, width: 1 };
	}

	if (width <= maxDimension && height <= maxDimension) {
		return { height: Math.round(height), width: Math.round(width) };
	}

	const scale = maxDimension / Math.max(width, height);

	return {
		height: Math.max(1, Math.round(height * scale)),
		width: Math.max(1, Math.round(width * scale)),
	};
}

// Generates an optimized still for the media grid: image thumbnails and
// video posters. Returns null when the browser cannot decode the asset —
// the upload then completes without a variant and the grid falls back to
// the original object or a type icon.
export async function generateMediaPreview(
	file: File,
): Promise<GeneratedMediaSource> {
	if (file.type.startsWith("video/")) {
		return captureVideoPoster(file);
	}

	if (file.type.startsWith("image/")) {
		return createImageThumbnail(file);
	}

	return { preview: null };
}

async function createImageThumbnail(file: File): Promise<GeneratedMediaSource> {
	try {
		const bitmap = await createImageBitmap(file);

		try {
			const { height, width } = computePreviewDimensions(
				bitmap.width,
				bitmap.height,
			);
			const blob = await drawScaledBitmap(bitmap, width, height);

			if (!blob) {
				return { height: bitmap.height, preview: null, width: bitmap.width };
			}

			return {
				height,
				preview: {
					blob,
					contentType: blob.type as AllowedMediaPreviewContentType,
				},
				width,
			};
		} finally {
			bitmap.close();
		}
	} catch {
		return { preview: null };
	}
}

async function captureVideoPoster(file: File): Promise<GeneratedMediaSource> {
	const objectUrl = URL.createObjectURL(file);
	const video = document.createElement("video");

	video.muted = true;
	video.playsInline = true;
	video.preload = "auto";

	try {
		video.src = objectUrl;
		await waitForVideoEvent(video, "loadedmetadata", "error");

		const durationSeconds =
			Number.isFinite(video.duration) && video.duration > 0
				? video.duration
				: undefined;
		const intrinsicWidth = video.videoWidth;
		const intrinsicHeight = video.videoHeight;

		if (!intrinsicWidth || !intrinsicHeight) {
			return { durationSeconds, preview: null };
		}

		const targetTime = Math.min(1, (durationSeconds ?? 1) / 2);

		if (video.readyState < 2) {
			await waitForVideoEvent(video, "canplay", "error");
		}

		if (Math.abs(video.currentTime - targetTime) > 0.05) {
			const seeked = waitForVideoEvent(video, "seeked", "error", true);
			video.currentTime = targetTime;
			await seeked;
		}

		const { height, width } = computePreviewDimensions(
			intrinsicWidth,
			intrinsicHeight,
		);
		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;

		const context = canvas.getContext("2d");

		if (!context) {
			return {
				durationSeconds,
				height: intrinsicHeight,
				preview: null,
				width: intrinsicWidth,
			};
		}

		context.drawImage(video, 0, 0, width, height);
		const blob = await canvasToBlob(canvas, "image/jpeg", PREVIEW_QUALITY);

		if (!blob || !isPreviewContentType(blob.type)) {
			return {
				durationSeconds,
				height: intrinsicHeight,
				preview: null,
				width: intrinsicWidth,
			};
		}

		return {
			durationSeconds,
			height: intrinsicHeight,
			preview: { blob, contentType: blob.type },
			width: intrinsicWidth,
		};
	} catch {
		return { preview: null };
	} finally {
		URL.revokeObjectURL(objectUrl);
		video.removeAttribute("src");
		video.load();
	}
}

async function drawScaledBitmap(
	bitmap: ImageBitmap,
	width: number,
	height: number,
): Promise<Blob | null> {
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;

	const context = canvas.getContext("2d");

	if (!context) {
		return null;
	}

	context.drawImage(bitmap, 0, 0, width, height);

	const webpBlob = await canvasToBlob(canvas, "image/webp", PREVIEW_QUALITY);

	if (webpBlob && isPreviewContentType(webpBlob.type)) {
		return webpBlob;
	}

	const jpegBlob = await canvasToBlob(canvas, "image/jpeg", PREVIEW_QUALITY);

	return jpegBlob && isPreviewContentType(jpegBlob.type) ? jpegBlob : null;
}

function canvasToBlob(
	canvas: HTMLCanvasElement,
	type: string,
	quality: number,
): Promise<Blob | null> {
	return new Promise((resolve) => {
		canvas.toBlob((blob) => resolve(blob), type, quality);
	});
}

function isPreviewContentType(
	type: string,
): type is AllowedMediaPreviewContentType {
	return type === "image/webp" || type === "image/jpeg" || type === "image/png";
}

function waitForVideoEvent(
	video: HTMLVideoElement,
	successEvent: string,
	errorEvent: string,
	timeout = false,
): Promise<void> {
	return new Promise((resolve, reject) => {
		let timer: number | undefined;

		const cleanup = () => {
			video.removeEventListener(successEvent, onSuccess);
			video.removeEventListener(errorEvent, onError);
			if (timer !== undefined) {
				window.clearTimeout(timer);
			}
		};

		const onSuccess = () => {
			cleanup();
			resolve();
		};

		const onError = () => {
			cleanup();
			reject(new Error("Could not read this video"));
		};

		video.addEventListener(successEvent, onSuccess, { once: true });
		video.addEventListener(errorEvent, onError, { once: true });

		if (timeout) {
			timer = window.setTimeout(() => {
				cleanup();
				resolve();
			}, VIDEO_SEEK_TIMEOUT_MS);
		}
	});
}
