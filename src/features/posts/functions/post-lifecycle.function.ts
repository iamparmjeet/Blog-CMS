import { createServerFn } from "@tanstack/react-start";
import { requireSession } from "#/lib/auth/auth.server";
import { postLifecycleInputSchema } from "./post-lifecycle.query";
import { applyPostLifecycleActionForOwner } from "./post-lifecycle.server";

export const applyPostLifecycle = createServerFn({ method: "POST" })
	.validator(postLifecycleInputSchema)
	.handler(async ({ data }) => {
		const session = await requireSession();

		return applyPostLifecycleActionForOwner({
			userId: session.user.id,
			postIds: data.postIds,
			action: data.action,
		});
	});
