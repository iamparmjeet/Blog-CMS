import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSession } from "#/lib/auth/auth.server";
import {
	deleteMediaForOwner,
	readMediaUsageForOwner,
} from "./media-usage.server";

const mediaReferenceSchema = z.object({
	mediaId: z.number().int().positive(),
});

const deleteMediaSchema = z.object({
	acknowledgeUsage: z.boolean().optional(),
	mediaId: z.number().int().positive(),
});

export const getMediaUsage = createServerFn({ method: "POST" })
	.validator(mediaReferenceSchema)
	.handler(async ({ data }) => {
		const session = await requireSession();

		return readMediaUsageForOwner({
			mediaId: data.mediaId,
			userId: session.user.id,
		});
	});

export const deleteMedia = createServerFn({ method: "POST" })
	.validator(deleteMediaSchema)
	.handler(async ({ data }) => {
		const session = await requireSession();

		return deleteMediaForOwner({
			acknowledgeUsage: data.acknowledgeUsage,
			mediaId: data.mediaId,
			userId: session.user.id,
		});
	});
