import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function hexToRgba(hex: string, alpha: number): string {
	const value = Number.parseInt(hex.replace("#", ""), 16);
	const red = (value >> 16) & 255;
	const green = (value >> 8) & 255;
	const blue = value & 255;

	return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
