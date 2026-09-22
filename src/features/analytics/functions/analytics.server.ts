import { eq } from "drizzle-orm";
import { getDb } from "#/db";
import { settings } from "#/db/schema";
import { env } from "#/env";
import {
	type AnalyticsDisplay,
	resolveAnalyticsDisplay,
} from "../analytics.config";

export async function readAnalyticsDisplay(
	userId: string,
): Promise<AnalyticsDisplay> {
	const row = await getDb()
		.select({ umamiShareUrl: settings.umamiShareUrl })
		.from(settings)
		.where(eq(settings.userId, userId))
		.limit(1)
		.get();

	return resolveAnalyticsDisplay({
		umamiShareUrl: row?.umamiShareUrl,
		envUmamiUrl: env.UMAMI_URL,
	});
}
