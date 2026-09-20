export function formatMediaSize(sizeKb: number): string {
	if (sizeKb < 1024) {
		return `${sizeKb} KB`;
	}

	return `${(sizeKb / 1024).toFixed(1)} MB`;
}
