import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
	MAX_MEDIA_PREVIEW_SIZE_BYTES,
	MAX_MEDIA_SIZE_BYTES,
} from "#/constants/media.constants";
import { requireSession } from "#/lib/auth/auth.server";
import {
	MEDIA_CONTENT_TYPES,
	MEDIA_PREVIEW_CONTENT_TYPES,
} from "../media.types";
import {
	cancelMediaUploadForOwner,
	completeMediaUploadForOwner,
	initiateMediaUploadForOwner,
} from "./media-upload.server";

const mediaPreviewInputSchema = z.object({
	contentType: z.enum(MEDIA_PREVIEW_CONTENT_TYPES),
	sizeBytes: z.number().int().positive().max(MAX_MEDIA_PREVIEW_SIZE_BYTES),
});

const mediaUploadInputSchema = z.object({
	contentType: z.enum(MEDIA_CONTENT_TYPES),
	durationSeconds: z.number().positive().max(86_400).optional(),
	fileName: z.string().trim().min(1).max(255),
	height: z.number().int().positive().max(100_000).optional(),
	preview: mediaPreviewInputSchema.optional(),
	sizeBytes: z.number().int().positive().max(MAX_MEDIA_SIZE_BYTES),
	width: z.number().int().positive().max(100_000).optional(),
});

const mediaUploadReferenceSchema = z.object({
	mediaId: z.number().int().positive(),
});

export const initiateMediaUpload = createServerFn({ method: "POST" })
	.validator(mediaUploadInputSchema)
	.handler(async ({ data }) => {
		const session = await requireSession();

		return initiateMediaUploadForOwner({
			...data,
			userId: session.user.id,
		});
	});

export const completeMediaUpload = createServerFn({ method: "POST" })
	.validator(mediaUploadReferenceSchema)
	.handler(async ({ data }) => {
		const session = await requireSession();

		return completeMediaUploadForOwner({
			mediaId: data.mediaId,
			userId: session.user.id,
		});
	});

export const cancelMediaUpload = createServerFn({ method: "POST" })
	.validator(mediaUploadReferenceSchema)
	.handler(async ({ data }) => {
		const session = await requireSession();

		await cancelMediaUploadForOwner({
			mediaId: data.mediaId,
			userId: session.user.id,
		});

		return { cancelled: true };
	});
