import { describe, expect, it } from "vitest";
import {
	computeColumnCount,
	computeRowCount,
	rowOfIndex,
	rowSlice,
} from "./grid-virtual";

describe("computeColumnCount", () => {
	const metrics = { minColumnWidth: 150, columnGap: 24 };

	it("fits as many min-width tracks as possible, gaps between them", () => {
		// 5 tracks need 5*150 + 4*24 = 846px.
		expect(computeColumnCount({ ...metrics, availableWidth: 846 })).toBe(5);
		expect(computeColumnCount({ ...metrics, availableWidth: 845 })).toBe(4);
	});

	it("matches CSS auto-fill at exact track boundaries", () => {
		// 2 tracks need 150 + 24 + 150 = 324px.
		expect(computeColumnCount({ ...metrics, availableWidth: 324 })).toBe(2);
		expect(computeColumnCount({ ...metrics, availableWidth: 323 })).toBe(1);
	});

	it("never reports fewer than one column", () => {
		expect(computeColumnCount({ ...metrics, availableWidth: 0 })).toBe(1);
		expect(computeColumnCount({ ...metrics, availableWidth: -50 })).toBe(1);
	});

	it("guards against a non-positive min column width", () => {
		expect(
			computeColumnCount({
				availableWidth: 800,
				minColumnWidth: 0,
				columnGap: 24,
			}),
		).toBe(1);
	});
});

describe("computeRowCount", () => {
	it("rounds partial rows up", () => {
		expect(computeRowCount(10, 4)).toBe(3);
		expect(computeRowCount(8, 4)).toBe(2);
		expect(computeRowCount(1, 4)).toBe(1);
	});

	it("is zero for an empty list", () => {
		expect(computeRowCount(0, 4)).toBe(0);
	});

	it("is zero when there are no columns", () => {
		expect(computeRowCount(10, 0)).toBe(0);
	});
});

describe("rowOfIndex", () => {
	it("maps flat indices onto rows", () => {
		expect(rowOfIndex(0, 4)).toBe(0);
		expect(rowOfIndex(3, 4)).toBe(0);
		expect(rowOfIndex(4, 4)).toBe(1);
		expect(rowOfIndex(11, 4)).toBe(2);
	});

	it("clamps negative indices to the first row", () => {
		expect(rowOfIndex(-1, 4)).toBe(0);
	});

	it("treats a degenerate column count as a single column", () => {
		expect(rowOfIndex(3, 0)).toBe(3);
	});
});

describe("rowSlice", () => {
	it("slices full rows", () => {
		expect(rowSlice(0, 4, 10)).toEqual({ start: 0, end: 4 });
		expect(rowSlice(1, 4, 10)).toEqual({ start: 4, end: 8 });
	});

	it("truncates the partial last row", () => {
		expect(rowSlice(2, 4, 10)).toEqual({ start: 8, end: 10 });
	});

	it("yields an empty slice past the end", () => {
		expect(rowSlice(3, 4, 10)).toEqual({ start: 10, end: 10 });
	});

	it("round-trips with rowOfIndex", () => {
		const columns = 5;
		const itemCount = 23;
		for (let index = 0; index < itemCount; index += 1) {
			const { start, end } = rowSlice(
				rowOfIndex(index, columns),
				columns,
				itemCount,
			);
			expect(index).toBeGreaterThanOrEqual(start);
			expect(index).toBeLessThan(end);
		}
	});
});
