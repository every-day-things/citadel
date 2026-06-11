import { LibraryBookSortOrder } from "@/stores/library-view/store";
import { describe, expect, it } from "vitest";
import { librarySortOptions } from "./library-sort-options";

describe("librarySortOptions", () => {
	it("includes every LibraryBookSortOrder key exactly once", () => {
		const keys = Object.keys(LibraryBookSortOrder);
		const optionValues = librarySortOptions.map((option) => option.value);

		expect(optionValues).toHaveLength(keys.length);
		for (const key of keys) {
			expect(optionValues.filter((value) => value === key)).toHaveLength(1);
		}
	});

	it("has a non-empty label for every option", () => {
		for (const option of librarySortOptions) {
			expect(option.label.length).toBeGreaterThan(0);
		}
	});
});
