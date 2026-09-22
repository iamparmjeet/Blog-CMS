// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SurfaceTintPicker } from "./settings-widgets";

afterEach(() => {
	cleanup();
});

function getHexInput(container: HTMLElement): HTMLInputElement {
	const input = container.querySelector<HTMLInputElement>(
		'input[aria-label="Surface tint hex"]',
	);
	if (!input) {
		throw new Error("hex input not found");
	}
	return input;
}

describe("SurfaceTintPicker", () => {
	it("accepts partial hex keystrokes and propagates a complete value", () => {
		const onChange = vi.fn();
		const { container } = render(
			<SurfaceTintPicker onChange={onChange} value="" />,
		);
		const input = getHexInput(container);

		for (const char of "#f43f5e") {
			fireEvent.change(input, { target: { value: input.value + char } });
		}

		expect(input.value).toBe("#f43f5e");
		expect(onChange).toHaveBeenLastCalledWith("#f43f5e");
	});

	it("reverts an invalid draft to the last valid value on blur", () => {
		const onChange = vi.fn();
		const { container } = render(
			<SurfaceTintPicker onChange={onChange} value="#2563eb" />,
		);
		const input = getHexInput(container);

		fireEvent.change(input, { target: { value: "#zz" } });
		expect(input.value).toBe("#zz");
		expect(onChange).not.toHaveBeenCalled();

		fireEvent.blur(input);
		expect(input.value).toBe("#2563eb");
	});

	it("clears through the Clear button", () => {
		const onChange = vi.fn();
		const { getByRole } = render(
			<SurfaceTintPicker onChange={onChange} value="#2563eb" />,
		);

		fireEvent.click(getByRole("button", { name: "Clear" }));
		expect(onChange).toHaveBeenCalledWith("");
	});
});
