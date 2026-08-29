export function formatNumber(value: number): string {
	return numberFormatter.format(value);
}

export const numberFormatter = new Intl.NumberFormat("en-IN");
