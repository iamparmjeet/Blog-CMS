import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { MAX_MEDIA_SIZE_BYTES } from "#/constants/media.constants";
import { requireSession } from "#/lib/auth/auth.server";
import { MEDIA_CONTENT_TYPES } from "../media.types";
import {
	cancelMediaUploadForOwner,
	completeMediaUploadForOwner,
	initiateMediaUploadForOwner,
} from "./media-upload.server";

const mediaUploadInputSchema = z.object({
	contentType: z.enum(MEDIA_CONTENT_TYPES),
	fileName: z.string().trim().min(1).max(255),
	sizeBytes: z.number().int().positive().max(MAX_MEDIA_SIZE_BYTES),
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
