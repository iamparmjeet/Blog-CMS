import { createServerFn } from "@tanstack/react-start";
import { requireSession } from "#/lib/auth/auth.server";
import {
	savePostScheduleForOwner,
	savePostScheduleInputSchema,
} from "./save-post-schedule.server";

export const savePostSchedule = createServerFn({
	method: "POST",
})
	.validator(savePostScheduleInputSchema)
	.handler(async ({ data }) => {
		const session = await requireSession();

		return savePostScheduleForOwner({
			userId: session.user.id,
			postId: data.postId,
			dateTimeLocal: data.dateTimeLocal,
		});
	});
