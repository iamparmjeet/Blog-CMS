import { and, desc, eq, isNull } from "drizzle-orm";
import type { Db } from "#/db";
import { media } from "#/db/schema";

export interface CreatePendingMediaInput {
	contentType: string;
	fileKey: string;
	name: string;
	sizeBytes: number;
	url: string;
	userId: string;
}

const mediaSelection = {
	createdAt: media.createdAt,
	dims: media.dims,
	duration: media.duration,
	id: media.id,
	name: media.name,
	size: media.size,
	status: media.status,
	type: media.type,
	url: media.url,
};

export function selectReadyMediaByOwner(db: Db, userId: string) {
	return db
		.select(mediaSelection)
		.from(media)
		.where(
			and(
				eq(media.userId, userId),
				eq(media.status, "ready"),
				isNull(media.deletedAt),
			),
		)
		.orderBy(desc(media.createdAt));
}

export function createPendingMedia(db: Db, input: CreatePendingMediaInput) {
	return db
		.insert(media)
		.values({
			fileKey: input.fileKey,
			name: input.name,
			size: String(input.sizeBytes),
			status: "pending",
			type: input.contentType,
			url: input.url,
			userId: input.userId,
		})
		.returning(mediaSelection)
		.get();
}

export function selectMediaUploadByOwner(
	db: Db,
	userId: string,
	mediaId: number,
) {
	return db
		.select({
			createdAt: media.createdAt,
			dims: media.dims,
			duration: media.duration,
			fileKey: media.fileKey,
			id: media.id,
			name: media.name,
			size: media.size,
			status: media.status,
			type: media.type,
			url: media.url,
		})
		.from(media)
		.where(
			and(
				eq(media.id, mediaId),
				eq(media.userId, userId),
				isNull(media.deletedAt),
			),
		)
		.get();
}

export function markMediaReady(db: Db, userId: string, mediaId: number) {
	return db
		.update(media)
		.set({ status: "ready" })
		.where(
			and(
				eq(media.id, mediaId),
				eq(media.userId, userId),
				eq(media.status, "pending"),
				isNull(media.deletedAt),
			),
		)
		.returning(mediaSelection)
		.get();
}

export function deletePendingMedia(db: Db, userId: string, mediaId: number) {
	return db
		.delete(media)
		.where(
			and(
				eq(media.id, mediaId),
				eq(media.userId, userId),
				eq(media.status, "pending"),
			),
		)
		.returning({ id: media.id })
		.get();
}
