import { describe, expect, it } from "vitest";
import { sortedTagNames, tagListChanged } from "./tag";

describe("sortedTagNames", () => {
	it("extracts names sorted with localeCompare", () => {
		expect(
			sortedTagNames([
				{ name: "fantasy" },
				{ name: "Adventure" },
				{ name: "banned" },
			]),
		).toEqual(["Adventure", "banned", "fantasy"]);
	});

	it("keeps duplicates and handles an empty vocabulary", () => {
		expect(sortedTagNames([])).toEqual([]);
		expect(sortedTagNames([{ name: "a" }, { name: "a" }])).toEqual(["a", "a"]);
	});
});

describe("tagListChanged", () => {
	it("treats null as tags untouched", () => {
		expect(tagListChanged(["fantasy"], null)).toBe(false);
	});

	it("ignores order", () => {
		expect(tagListChanged(["a", "b"], ["b", "a"])).toBe(false);
	});

	it("detects added, removed, and renamed tags", () => {
		expect(tagListChanged([], ["new"])).toBe(true);
		expect(tagListChanged(["old"], [])).toBe(true);
		expect(tagListChanged(["old"], ["renamed"])).toBe(true);
	});

	it("treats identical lists as unchanged", () => {
		expect(tagListChanged([], [])).toBe(false);
		expect(tagListChanged(["a"], ["a"])).toBe(false);
	});
});
