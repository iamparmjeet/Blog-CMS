import { describe, expect, it } from "vitest";
import {
	computePreviewDimensions,
	PREVIEW_MAX_DIMENSION,
} from "./media-preview";

describe("computePreviewDimensions", () => {
	it("keeps small assets at their intrinsic size", () => {
		expect(computePreviewDimensions(320, 240)).toEqual({
			height: 240,
			width: 320,
		});
	});

	it("scales large assets down to the maximum dimension", () => {
		expect(computePreviewDimensions(1920, 1080)).toEqual({
			height: Math.round((1080 * PREVIEW_MAX_DIMENSION) / 1920),
			width: PREVIEW_MAX_DIMENSION,
		});
	});

	it("scales portrait assets by their height", () => {
		expect(computePreviewDimensions(720, 1280)).toEqual({
			height: PREVIEW_MAX_DIMENSION,
			width: Math.round((720 * PREVIEW_MAX_DIMENSION) / 1280),
		});
	});

	it("never returns zero dimensions", () => {
		expect(computePreviewDimensions(1, 10_000)).toEqual({
			height: PREVIEW_MAX_DIMENSION,
			width: 1,
		});
		expect(computePreviewDimensions(0, 0)).toEqual({ height: 1, width: 1 });
	});
});
