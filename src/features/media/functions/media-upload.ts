import { MAX_MEDIA_SIZE_BYTES } from "#/constants/media.constants";
import {
	type AllowedMediaContentType,
	MEDIA_CONTENT_TYPES,
	type MediaUploadInput,
	type ValidatedMediaUpload,
} from "../media.types";

// Business Validation
export function validateMediaUpload(
	input: MediaUploadInput,
): ValidatedMediaUpload {
	if (!Number.isSafeInteger(input.sizeBytes) || input.sizeBytes <= 0) {
		throw new Error("Select a non-empty file to upload");
	}

	if (input.sizeBytes > MAX_MEDIA_SIZE_BYTES) {
		throw new Error("Files must be 50 MB or smaller");
	}

	if (!isAllowedMediaContentType(input.contentType)) {
		throw new Error("Unsupported file type");
	}

	return {
		contentType: input.contentType,
		fileName: sanitizeMediaFileName(input.fileName),
		sizeBytes: input.sizeBytes,
	};
}

// ********* Supporting functions ************
export function isAllowedMediaContentType(
	contentType: string,
): contentType is AllowedMediaContentType {
	return MEDIA_CONTENT_TYPES.some((allowedType) => allowedType === contentType);
}

// Prevents client supplied paths and unsafe key names
export function sanitizeMediaFileName(fileName: string): string {
	const baseName = fileName.split(/[\\/]/).at(-1)?.trim() ?? "";
	const lastDot = baseName.lastIndexOf(".");
	const hasExtension = lastDot > 0;
	const rawStem = hasExtension ? baseName.slice(0, lastDot) : baseName;
	const rawExtension = hasExtension ? baseName.slice(lastDot + 1) : "";

	const stem = rawStem
		.normalize("NFKD")
		.replace(/[^\w-]+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 100);

	const extension = rawExtension
		.normalize("NFKD")
		.replace(/[^a-zA-Z0-9]/g, "")
		.toLowerCase()
		.slice(0, 10);

	const safeStem = stem || "upload";

	return extension ? `${safeStem}.${extension}` : safeStem;
}

export function createMediaObjectKey({
	fileName,
	objectId = crypto.randomUUID(),
	userId,
}: {
	fileName: string;
	objectId?: string;
	userId: string;
}): string {
	if (!userId) {
		throw new Error("A media owner is required");
	}

	return `media/${userId}/${objectId}-${sanitizeMediaFileName(fileName)}`;
}

// Contructs the permanent public URL, not the temp upload URL
export function createMediaPublicUrl({
	fileKey,
	publicUrl,
}: {
	fileKey: string;
	publicUrl: string;
}): string {
	const baseUrl = new URL(publicUrl);

	if (!["http:", "https:"].includes(baseUrl.protocol)) {
		throw new Error("R2 public URL must use HTTP or HTTPS");
	}

	if (baseUrl.username || baseUrl.password) {
		throw new Error("R2 public URL must not contain credentials");
	}

	baseUrl.search = "";
	baseUrl.hash = "";
	baseUrl.pathname = `${baseUrl.pathname.replace(/\/$/, "")}/${fileKey}`;

	return baseUrl.toString();
}
