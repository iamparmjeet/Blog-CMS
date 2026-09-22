import { getDb } from "#/db";
import {
	type SavePostScheduleInput,
	savePostSchedule,
	savePostScheduleInputSchema,
} from "./save-post-schedule.query";

export async function savePostScheduleForOwner(
	input: SavePostScheduleInput & { userId: string },
) {
	return savePostSchedule(getDb(), input);
}

export { savePostScheduleInputSchema };
