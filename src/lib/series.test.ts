import { describe, expect, it } from "vitest";
import { deriveSeriesSummaries, formatSeriesIndex } from "./series";

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

describe("deriveSeriesSummaries", () => {
	it("groups books by series and counts them", () => {
		const books = [
			{ series: "Discworld" },
			{ series: "Discworld" },
			{ series: "Culture" },
			{ series: null },
		];

		expect(deriveSeriesSummaries(books)).toEqual([
			{ name: "Culture", bookCount: 1 },
			{ name: "Discworld", bookCount: 2 },
		]);
	});

	it("ignores books without a series", () => {
		expect(deriveSeriesSummaries([{ series: null }, { series: null }])).toEqual(
			[],
		);
	});

	it("sorts series alphabetically", () => {
		const books = [{ series: "Zeta" }, { series: "Alpha" }, { series: "Mu" }];

		expect(deriveSeriesSummaries(books).map(({ name }) => name)).toEqual([
			"Alpha",
			"Mu",
			"Zeta",
		]);
	});
});
