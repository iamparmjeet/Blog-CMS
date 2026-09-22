import handler from "@tanstack/react-start/server-entry";
import { drizzle } from "drizzle-orm/d1";
import { promoteDueScheduledPosts } from "./features/posts/functions/promote-scheduled.query";

export default {
	fetch: handler.fetch,

	async scheduled(controller: ScheduledController, env: Env): Promise<void> {
		const { postIds } = await promoteDueScheduledPosts(
			drizzle(env.DB),
			new Date(controller.scheduledTime),
		);

		console.log(`schedule promoter: published ${postIds.length} due post(s)`);
	},
};
