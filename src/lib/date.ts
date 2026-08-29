export function Year() {
	return new Date().getFullYear();
}

export const dateFormatter = new Intl.DateTimeFormat("en-IN", {
	dateStyle: "medium",
	timeZone: "UTC",
});

export function formatDate(value: string): string {
	const date = new Date(value);

	if (Number.isNaN(date.getTime())) {
		return "Unknown date";
	}

	return dateFormatter.format(date);
}
