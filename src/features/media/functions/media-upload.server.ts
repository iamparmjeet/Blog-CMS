import { env } from "cloudflare:workers";
import { AwsClient } from "aws4fetch";
import { MEDIA_CACHE_CONTROL } from "#/constants/media.constants";
import { getDb } from "#/db";
import type { MediaUploadInput } from "../media.types";
import { toMediaItem } from "../media.utils";
import {
	createMediaObjectKey,
	createMediaPublicUrl,
	validateMediaUpload,
} from "./media-upload";
import {
	createPendingMedia,
	deletePendingMedia,
	markMediaReady,
	selectMediaUploadByOwner,
} from "./media-upload.query";

const PRESIGNED_UPLOAD_EXPIRY_SECONDS = 5 * 60;

interface InitiateMediaUploadInput extends MediaUploadInput {
	userId: string;
}

interface CompleteMediaUploadInput {
	mediaId: number;
	userId: string;
}

interface CancelMediaUploadInput {
	mediaId: number;
	userId: string;
}

interface R2UploadConfig {
	accessKeyId: string;
	accountId: string;
	bucketName: string;
	publicUrl: string;
	secretAccessKey: string;
}

export async function initiateMediaUploadForOwner({
	userId,
	...input
}: InitiateMediaUploadInput) {
	const upload = validateMediaUpload(input);
	const config = getR2UploadConfig();
	const fileKey = createMediaObjectKey({
		fileName: upload.fileName,
		userId,
	});

	const uploadUrl = await createPresignedUploadUrl({
		config,
		contentType: upload.contentType,
		fileKey,
	});

	const created = await createPendingMedia(getDb(), {
		contentType: upload.contentType,
		fileKey,
		name: upload.fileName,
		sizeBytes: upload.sizeBytes,
		url: createMediaPublicUrl({
			fileKey,
			publicUrl: config.publicUrl,
		}),
		userId,
	});

	if (!created) {
		throw new Error("Could not prepare media upload");
	}

	return {
		uploadHeaders: {
			"Cache-Control": MEDIA_CACHE_CONTROL,
			"Content-Type": upload.contentType,
		},
		mediaId: created.id,
		uploadUrl,
	};
}

export async function completeMediaUploadForOwner({
	mediaId,
	userId,
}: CompleteMediaUploadInput) {
	const db = getDb();
	const pendingMedia = await selectMediaUploadByOwner(db, userId, mediaId);

	if (!pendingMedia?.fileKey) {
		throw new Error("Media upload not found");
	}

	if (pendingMedia.status === "ready") {
		return toMediaItem(pendingMedia);
	}

	if (pendingMedia.status !== "pending") {
		throw new Error("Media upload cannot be completed");
	}

	const object = await env.MEDIA.head(pendingMedia.fileKey);
	const expectedSize = Number(pendingMedia.size);
	const matchesExpectedUpload =
		object?.size === expectedSize &&
		object.httpMetadata?.contentType === pendingMedia.type;

	if (!object || !matchesExpectedUpload) {
		if (object) {
			await env.MEDIA.delete(pendingMedia.fileKey);
		}

		await deletePendingMedia(db, userId, mediaId);
		throw new Error("Uploaded file could not be verified");
	}

	const completed = await markMediaReady(db, userId, mediaId);

	if (!completed) {
		const existing = await selectMediaUploadByOwner(db, userId, mediaId);

		if (existing?.status === "ready") {
			return toMediaItem(existing);
		}

		throw new Error("Could not complete media upload");
	}

	return toMediaItem(completed);
}

export async function cancelMediaUploadForOwner({
	mediaId,
	userId,
}: CancelMediaUploadInput): Promise<void> {
	const db = getDb();
	const pendingMedia = await selectMediaUploadByOwner(db, userId, mediaId);

	if (!pendingMedia || pendingMedia.status !== "pending") {
		return;
	}

	if (pendingMedia.fileKey) {
		await env.MEDIA.delete(pendingMedia.fileKey);
	}

	await deletePendingMedia(db, userId, mediaId);
}

function getR2UploadConfig(): R2UploadConfig {
	const config = {
		accessKeyId: env.R2_ACCESS_KEY_ID,
		accountId: env.R2_ACCOUNT_ID,
		bucketName: env.R2_BUCKET_NAME,
		publicUrl: env.R2_PUBLIC_URL,
		secretAccessKey: env.R2_SECRET_ACCESS_KEY,
	};

	if (Object.values(config).some((value) => !value)) {
		throw new Error("R2 uploads are not configured");
	}

	return config;
}

async function createPresignedUploadUrl({
	config,
	contentType,
	fileKey,
}: {
	config: R2UploadConfig;
	contentType: string;
	fileKey: string;
}): Promise<string> {
	const objectPath = [config.bucketName, ...fileKey.split("/")]
		.map(encodeURIComponent)
		.join("/");

	const url = new URL(
		`https://${config.accountId}.r2.cloudflarestorage.com/${objectPath}`,
	);

	url.searchParams.set(
		"X-Amz-Expires",
		String(PRESIGNED_UPLOAD_EXPIRY_SECONDS),
	);

	const client = new AwsClient({
		accessKeyId: config.accessKeyId,
		region: "auto",
		secretAccessKey: config.secretAccessKey,
		service: "s3",
	});

	const request = await client.sign(
		new Request(url, {
			headers: {
				"Cache-Control": MEDIA_CACHE_CONTROL,
				"Content-Type": contentType,
			},
			method: "PUT",
		}),
		{
			aws: {
				signQuery: true,
			},
		},
	);

	return request.url;
}
