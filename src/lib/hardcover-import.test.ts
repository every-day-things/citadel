import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HardcoverBookMetadata, HardcoverSearchResult } from "@/bindings";
import { commands } from "@/bindings";
import {
	applyHardcoverMetadataToBook,
	buildSearchQuery,
	lookupByIsbn,
	searchHardcoverCombined,
} from "./hardcover-import";

vi.mock("@/bindings", () => ({
	commands: {
		searchHardcoverBooks: vi.fn(),
		fetchHardcoverMetadataByBookId: vi.fn(),
	},
}));

const searchHardcoverBooks = vi.mocked(commands.searchHardcoverBooks);
const fetchHardcoverMetadataByBookId = vi.mocked(
	commands.fetchHardcoverMetadataByBookId,
);

const searchResultFactory = (
	overrides: Partial<HardcoverSearchResult> = {},
): HardcoverSearchResult => ({
	title: "The Forever War",
	description: "A war across the stars.",
	image_url: "https://example.com/forever-war.jpg",
	isbn: "9780316212366",
	release_year: 1974,
	hardcover_id: 42,
	slug: "the-forever-war",
	authors: ["Joe Haldeman"],
	...overrides,
});

const bookMetadataFactory = (
	overrides: Partial<HardcoverBookMetadata> = {},
): HardcoverBookMetadata => ({
	title: "The Forever War (Resolved)",
	description: "Resolved description.",
	image_url: "https://example.com/resolved.jpg",
	isbn: "9780312536633",
	release_year: 1975,
	hardcover_id: 42,
	slug: "the-forever-war-resolved",
	...overrides,
});

beforeEach(() => {
	vi.resetAllMocks();
});

describe("lookupByIsbn", () => {
	it("rejects a non-ISBN identifier without calling any commands", async () => {
		const result = await lookupByIsbn("api-key", "uuid:1234-5678");

		expect(result).toEqual({
			ok: false,
			error:
				"This file's identifier (\"uuid:1234-5678\") isn't an ISBN, so it can't be looked up on Hardcover.",
		});
		expect(searchHardcoverBooks).not.toHaveBeenCalled();
		expect(fetchHardcoverMetadataByBookId).not.toHaveBeenCalled();
	});

	it("returns the search command's error", async () => {
		searchHardcoverBooks.mockResolvedValue({
			status: "error",
			error: "Invalid API key",
		});

		const result = await lookupByIsbn("api-key", "9780316212366");

		expect(result).toEqual({ ok: false, error: "Invalid API key" });
	});

	it("returns an error when the search has no results", async () => {
		searchHardcoverBooks.mockResolvedValue({ status: "ok", data: [] });

		const result = await lookupByIsbn("api-key", "978-0-316-21236-6");

		expect(result).toEqual({
			ok: false,
			error: "No Hardcover match for ISBN 9780316212366.",
		});
	});

	it("searches by the normalized ISBN and resolves the first result by id", async () => {
		searchHardcoverBooks.mockResolvedValue({
			status: "ok",
			data: [searchResultFactory()],
		});
		fetchHardcoverMetadataByBookId.mockResolvedValue({
			status: "ok",
			data: bookMetadataFactory(),
		});

		const result = await lookupByIsbn("api-key", "978-0-316-21236-6");

		expect(searchHardcoverBooks).toHaveBeenCalledWith(
			"api-key",
			"9780316212366",
		);
		expect(fetchHardcoverMetadataByBookId).toHaveBeenCalledWith("api-key", 42);
		expect(result).toEqual({
			ok: true,
			data: {
				title: "The Forever War (Resolved)",
				description: "Resolved description.",
				image_url: "https://example.com/resolved.jpg",
				isbn: "9780312536633",
				slug: "the-forever-war-resolved",
				hardcover_id: 42,
				release_year: 1975,
				authors: ["Joe Haldeman"],
			},
		});
	});

	it("prefers the result whose ISBN matches the query over an earlier fuzzy hit", async () => {
		searchHardcoverBooks.mockResolvedValue({
			status: "ok",
			data: [
				searchResultFactory({
					title: "The Forever War: A Companion",
					isbn: "9780312536633",
					hardcover_id: 7,
				}),
				searchResultFactory(),
			],
		});
		fetchHardcoverMetadataByBookId.mockRejectedValue(new Error("offline"));

		const result = await lookupByIsbn("api-key", "978-0-316-21236-6");

		expect(fetchHardcoverMetadataByBookId).toHaveBeenCalledWith("api-key", 42);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.title).toBe("The Forever War");
			expect(result.data.hardcover_id).toBe(42);
		}
	});

	it("matches ISBNs after normalization (hyphens, prefixes)", async () => {
		searchHardcoverBooks.mockResolvedValue({
			status: "ok",
			data: [
				searchResultFactory({
					title: "Wrong Book",
					isbn: null,
					hardcover_id: 7,
				}),
				searchResultFactory({ isbn: "ISBN: 978-0-316-21236-6" }),
			],
		});
		fetchHardcoverMetadataByBookId.mockRejectedValue(new Error("offline"));

		const result = await lookupByIsbn("api-key", "9780316212366");

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.hardcover_id).toBe(42);
			expect(result.data.title).toBe("The Forever War");
		}
	});

	it("falls back to the first result when no result's ISBN matches", async () => {
		searchHardcoverBooks.mockResolvedValue({
			status: "ok",
			data: [
				searchResultFactory({
					title: "Closest Fuzzy Match",
					isbn: "9780312536633",
					hardcover_id: 7,
				}),
				searchResultFactory({
					title: "Other Fuzzy Match",
					isbn: null,
					hardcover_id: 8,
				}),
			],
		});
		fetchHardcoverMetadataByBookId.mockRejectedValue(new Error("offline"));

		const result = await lookupByIsbn("api-key", "9780316212366");

		expect(fetchHardcoverMetadataByBookId).toHaveBeenCalledWith("api-key", 7);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.title).toBe("Closest Fuzzy Match");
			expect(result.data.hardcover_id).toBe(7);
		}
	});

	it("falls back to search-result fields when the resolved metadata has gaps", async () => {
		searchHardcoverBooks.mockResolvedValue({
			status: "ok",
			data: [searchResultFactory()],
		});
		fetchHardcoverMetadataByBookId.mockResolvedValue({
			status: "ok",
			data: bookMetadataFactory({
				description: null,
				image_url: null,
				isbn: null,
				slug: null,
				release_year: null,
			}),
		});

		const result = await lookupByIsbn("api-key", "9780316212366");

		expect(result).toEqual({
			ok: true,
			data: {
				title: "The Forever War (Resolved)",
				description: "A war across the stars.",
				image_url: "https://example.com/forever-war.jpg",
				isbn: "9780316212366",
				slug: "the-forever-war",
				hardcover_id: 42,
				release_year: 1974,
				authors: ["Joe Haldeman"],
			},
		});
	});

	it("falls back entirely to the search result when fetch-by-id rejects", async () => {
		searchHardcoverBooks.mockResolvedValue({
			status: "ok",
			data: [searchResultFactory()],
		});
		fetchHardcoverMetadataByBookId.mockRejectedValue(new Error("network down"));

		const result = await lookupByIsbn("api-key", "9780316212366");

		expect(result).toEqual({
			ok: true,
			data: {
				title: "The Forever War",
				description: "A war across the stars.",
				image_url: "https://example.com/forever-war.jpg",
				isbn: "9780316212366",
				slug: "the-forever-war",
				hardcover_id: 42,
				release_year: 1974,
				authors: ["Joe Haldeman"],
			},
		});
	});

	it("falls back entirely to the search result when fetch-by-id errors", async () => {
		searchHardcoverBooks.mockResolvedValue({
			status: "ok",
			data: [searchResultFactory()],
		});
		fetchHardcoverMetadataByBookId.mockResolvedValue({
			status: "error",
			error: "not found",
		});

		const result = await lookupByIsbn("api-key", "9780316212366");

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.title).toBe("The Forever War");
			expect(result.data.slug).toBe("the-forever-war");
		}
	});
});

describe("searchHardcoverCombined", () => {
	it("searches by query only when the file has no usable ISBN", async () => {
		const queryHit = searchResultFactory({ hardcover_id: 1 });
		searchHardcoverBooks.mockResolvedValue({ status: "ok", data: [queryHit] });

		const combined = await searchHardcoverCombined(
			"api-key",
			"forever war",
			"uuid:not-an-isbn",
		);

		expect(searchHardcoverBooks).toHaveBeenCalledTimes(1);
		expect(searchHardcoverBooks).toHaveBeenCalledWith("api-key", "forever war");
		expect(combined).toEqual({ results: [queryHit], isbnMatchId: null });
	});

	it("pins the ISBN-matched edition first and dedupes it from query results", async () => {
		const isbnEdition = searchResultFactory({
			hardcover_id: 7,
			isbn: "9780316212366",
		});
		const otherHit = searchResultFactory({ hardcover_id: 8, isbn: null });
		searchHardcoverBooks.mockImplementation(async (_key, query) =>
			query === "9780316212366"
				? {
						status: "ok",
						data: [
							searchResultFactory({ hardcover_id: 9, isbn: "9780000000002" }),
							isbnEdition,
						],
					}
				: { status: "ok", data: [otherHit, isbnEdition] },
		);

		const combined = await searchHardcoverCombined(
			"api-key",
			"forever war",
			"978-0-316-21236-6",
		);

		expect(combined.isbnMatchId).toBe(7);
		expect(combined.results).toEqual([isbnEdition, otherHit]);
	});

	it("ignores fuzzy ISBN-search noise when no result matches the ISBN", async () => {
		const queryHit = searchResultFactory({ hardcover_id: 1 });
		const fuzzyNoise = searchResultFactory({
			hardcover_id: 2,
			isbn: "9999999999999",
		});
		searchHardcoverBooks.mockImplementation(async (_key, query) =>
			query === "9780316212366"
				? { status: "ok", data: [fuzzyNoise] }
				: { status: "ok", data: [queryHit] },
		);

		const combined = await searchHardcoverCombined(
			"api-key",
			"forever war",
			"9780316212366",
		);

		expect(combined).toEqual({ results: [queryHit], isbnMatchId: null });
	});

	it("falls back to ISBN-search results when the query is empty", async () => {
		const isbnHit = searchResultFactory({ hardcover_id: 3, isbn: null });
		searchHardcoverBooks.mockResolvedValue({ status: "ok", data: [isbnHit] });

		const combined = await searchHardcoverCombined(
			"api-key",
			"  ",
			"9780316212366",
		);

		expect(searchHardcoverBooks).toHaveBeenCalledTimes(1);
		expect(searchHardcoverBooks).toHaveBeenCalledWith(
			"api-key",
			"9780316212366",
		);
		expect(combined).toEqual({ results: [isbnHit], isbnMatchId: null });
	});

	it("tolerates one of the two searches failing", async () => {
		const queryHit = searchResultFactory({ hardcover_id: 1 });
		searchHardcoverBooks.mockImplementation(async (_key, query) =>
			query === "9780316212366"
				? { status: "error", error: "rate limited" }
				: { status: "ok", data: [queryHit] },
		);

		const combined = await searchHardcoverCombined(
			"api-key",
			"forever war",
			"9780316212366",
		);

		expect(combined).toEqual({ results: [queryHit], isbnMatchId: null });
	});

	it("throws when both searches fail", async () => {
		searchHardcoverBooks.mockResolvedValue({
			status: "error",
			error: "Invalid API key",
		});

		await expect(
			searchHardcoverCombined("api-key", "forever war", "9780316212366"),
		).rejects.toThrow("Invalid API key");
	});
});

describe("buildSearchQuery", () => {
	it("joins the title and first author", () => {
		expect(buildSearchQuery("The Forever War", ["Joe Haldeman"])).toBe(
			"The Forever War Joe Haldeman",
		);
	});

	it("returns just the title when there are no authors", () => {
		expect(buildSearchQuery("The Forever War", [])).toBe("The Forever War");
	});

	it("skips blank author entries", () => {
		expect(buildSearchQuery("Dune", ["", "   ", "Frank Herbert"])).toBe(
			"Dune Frank Herbert",
		);
	});

	it("trims the title and author", () => {
		expect(buildSearchQuery("  Dune  ", ["  Frank Herbert  "])).toBe(
			"Dune Frank Herbert",
		);
	});

	it("returns just the author when the title is blank", () => {
		expect(buildSearchQuery("   ", ["Frank Herbert"])).toBe("Frank Herbert");
	});
});

describe("applyHardcoverMetadataToBook", () => {
	const pendingFactory = (
		overrides: Partial<Parameters<typeof applyHardcoverMetadataToBook>[1]> = {},
	) => ({
		title: "The Forever War",
		description: "A war across the stars.",
		image_url: "https://example.com/forever-war.jpg",
		isbn: "9780316212366",
		slug: "the-forever-war",
		hardcover_id: 42,
		release_year: 1974,
		authors: ["Joe Haldeman"],
		...overrides,
	});

	const makeDeps = () => ({
		upsertBookIdentifier: vi.fn().mockResolvedValue(undefined),
		updateBook: vi.fn().mockResolvedValue(undefined),
		setBookCoverFromUrl: vi.fn().mockResolvedValue(undefined),
	});

	it("stores the slug as the hardcover identifier", async () => {
		const deps = makeDeps();

		await applyHardcoverMetadataToBook("book-1", pendingFactory(), deps);

		expect(deps.upsertBookIdentifier).toHaveBeenCalledWith(
			"book-1",
			null,
			"hardcover",
			"the-forever-war",
		);
	});

	it("falls back to the hardcover id when the slug is null", async () => {
		const deps = makeDeps();

		await applyHardcoverMetadataToBook(
			"book-1",
			pendingFactory({ slug: null }),
			deps,
		);

		expect(deps.upsertBookIdentifier).toHaveBeenCalledWith(
			"book-1",
			null,
			"hardcover",
			"42",
		);
	});

	it("skips the identifier upsert when both slug and id are null", async () => {
		const deps = makeDeps();

		await applyHardcoverMetadataToBook(
			"book-1",
			pendingFactory({ slug: null, hardcover_id: null }),
			deps,
		);

		expect(deps.upsertBookIdentifier).not.toHaveBeenCalled();
	});

	it("updates only the description, leaving every other field untouched", async () => {
		const deps = makeDeps();

		await applyHardcoverMetadataToBook("book-1", pendingFactory(), deps);

		expect(deps.updateBook).toHaveBeenCalledWith("book-1", {
			author_id_list: null,
			tag_list: null,
			title: null,
			timestamp: null,
			publication_date: null,
			is_read: null,
			description: "A war across the stars.",
		});
	});

	it("skips updateBook when there is no description", async () => {
		const deps = makeDeps();

		await applyHardcoverMetadataToBook(
			"book-1",
			pendingFactory({ description: null }),
			deps,
		);

		expect(deps.updateBook).not.toHaveBeenCalled();
	});

	it("sets the cover when an image url is present", async () => {
		const deps = makeDeps();

		await applyHardcoverMetadataToBook("book-1", pendingFactory(), deps);

		expect(deps.setBookCoverFromUrl).toHaveBeenCalledWith(
			"book-1",
			"https://example.com/forever-war.jpg",
		);
	});

	it("skips the cover when there is no image url", async () => {
		const deps = makeDeps();

		await applyHardcoverMetadataToBook(
			"book-1",
			pendingFactory({ image_url: null }),
			deps,
		);

		expect(deps.setBookCoverFromUrl).not.toHaveBeenCalled();
	});
});
