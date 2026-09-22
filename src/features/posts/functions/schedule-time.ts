const DATE_TIME_LOCAL_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

interface DateTimeParts {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
}

function assertTimeZone(timeZone: string): void {
	try {
		new Intl.DateTimeFormat("en", { timeZone }).format(new Date());
	} catch {
		throw new Error(`Unknown time zone: ${timeZone}`);
	}
}

function parseDateTimeLocal(input: string): DateTimeParts {
	const match = DATE_TIME_LOCAL_PATTERN.exec(input);

	if (!match) {
		throw new Error(
			"Schedule time must look like YYYY-MM-DDTHH:mm (datetime-local).",
		);
	}

	const [, year, month, day, hour, minute] = match.map(Number) as [
		unknown,
		number,
		number,
		number,
		number,
		number,
	];

	const parts = { year, month, day, hour, minute };

	if (
		month < 1 ||
		month > 12 ||
		day < 1 ||
		day > 31 ||
		hour > 23 ||
		minute > 59
	) {
		throw new Error(
			"Schedule time must look like YYYY-MM-DDTHH:mm (datetime-local).",
		);
	}

	return parts;
}

function offsetMinutesAt(timeZone: string, instant: Date): number {
	const wallInZone = new Date(
		instant.toLocaleString("en-US", { timeZone }),
	).getTime();
	const wallInUtc = new Date(
		instant.toLocaleString("en-US", { timeZone: "UTC" }),
	).getTime();

	return Math.round((wallInZone - wallInUtc) / 60_000);
}

/**
 * Interprets a `datetime-local` wall time in the given IANA zone as a UTC
 * instant. Two offset passes keep the result correct across DST edges.
 */
export function zonedDateTimeToUtc(input: string, timeZone: string): Date {
	assertTimeZone(timeZone);

	const { year, month, day, hour, minute } = parseDateTimeLocal(input);

	let utcMillis = Date.UTC(year, month - 1, day, hour, minute);

	for (let pass = 0; pass < 2; pass += 1) {
		utcMillis =
			Date.UTC(year, month - 1, day, hour, minute) -
			offsetMinutesAt(timeZone, new Date(utcMillis)) * 60_000;
	}

	return new Date(utcMillis);
}

function twoDigits(value: string | undefined): string {
	return (value ?? "00").padStart(2, "0");
}

/**
 * Renders a UTC instant as a `datetime-local` wall time in the given zone.
 */
export function utcToDateTimeLocalInput(date: Date, timeZone: string): string {
	assertTimeZone(timeZone);

	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23",
	}).formatToParts(date);

	const get = (type: string) => parts.find((part) => part.type === type)?.value;

	return `${get("year")}-${twoDigits(get("month"))}-${twoDigits(get("day"))}T${twoDigits(get("hour"))}:${twoDigits(get("minute"))}`;
}
