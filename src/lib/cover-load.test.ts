import { describe, expect, it } from "vitest";
import { resolveCoverLoad } from "./cover-load";

describe("resolveCoverLoad", () => {
	it("treats an image with real intrinsic dimensions as loaded", () => {
		expect(resolveCoverLoad({ naturalWidth: 400, naturalHeight: 600 })).toBe(
			"loaded",
		);
	});

	it("treats a 0x0 'successful' load as failed (asset scope miss)", () => {
		// WebKit fires `load`, not `error`, for asset:// URLs outside the asset
		// scope — the image decodes to nothing.
		expect(resolveCoverLoad({ naturalWidth: 0, naturalHeight: 0 })).toBe(
			"failed",
		);
	});

	it("treats a zero-width image as failed", () => {
		expect(resolveCoverLoad({ naturalWidth: 0, naturalHeight: 600 })).toBe(
			"failed",
		);
	});

	it("treats a zero-height image as failed", () => {
		expect(resolveCoverLoad({ naturalWidth: 400, naturalHeight: 0 })).toBe(
			"failed",
		);
	});
});
