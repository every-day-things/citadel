import { LibraryAuthorFactory } from "@/test/factories/library-author";
import { describe, expect, it } from "vitest";
import { formatAuthorList } from "./authors";

describe("formatAuthorList", () => {
	it("should format a list of authors as one string that can be displayed to a user", () => {
		const authors = [
			LibraryAuthorFactory({ name: "Tris NoBoilerplate" }),
			LibraryAuthorFactory({ name: "Robert Pirzig" }),
		];

		expect(formatAuthorList(authors)).toBe("Tris NoBoilerplate, Robert Pirzig");
	});

	it("must not sort the authors", () => {
		const authorOne = LibraryAuthorFactory({ name: "Tris NoBoilerplate" });
		const authorTwo = LibraryAuthorFactory({ name: "Robert Pirzig" });

		expect(formatAuthorList([authorOne, authorTwo])).toBe(
			"Tris NoBoilerplate, Robert Pirzig",
		);
		expect(formatAuthorList([authorTwo, authorOne])).toBe(
			"Robert Pirzig, Tris NoBoilerplate",
		);
	});
});
