import { describe, expect, it } from "vitest";
import { formatSeriesIndex } from "./series";

describe("formatSeriesIndex", () => {
	it("formats whole indices without a trailing .0", () => {
		expect(formatSeriesIndex(1)).toBe("1");
		expect(formatSeriesIndex(1.0)).toBe("1");
		expect(formatSeriesIndex(12)).toBe("12");
	});

	it("keeps fractional indices", () => {
		expect(formatSeriesIndex(1.5)).toBe("1.5");
		expect(formatSeriesIndex(2.25)).toBe("2.25");
	});

	it("rounds away f32 float noise", () => {
		expect(formatSeriesIndex(0.10000000149011612)).toBe("0.1");
	});
});
