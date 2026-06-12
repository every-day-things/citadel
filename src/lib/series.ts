import type { LibraryBook } from "@/bindings";

export interface SeriesSummary {
	name: string;
	bookCount: number;
}

/**
 * Formats a series index for display, without a trailing ".0". Indices are
 * stored as f32 in Calibre, so values are rounded to two decimals to hide
 * float noise (0.1 arrives as 0.10000000149011612).
 *
 * @example
 * ```ts
 * formatSeriesIndex(1); // "1"
 * formatSeriesIndex(1.5); // "1.5"
 * ```
 */
export const formatSeriesIndex = (seriesIndex: number): string =>
	String(Math.round(seriesIndex * 100) / 100);

/**
 * Derives the list of series in a library from its books, with a book count
 * per series, sorted alphabetically by series name.
 */
export const deriveSeriesSummaries = (
	books: Pick<LibraryBook, "series">[],
): SeriesSummary[] => {
	const bookCountBySeries = new Map<string, number>();
	for (const { series } of books) {
		if (series === null) continue;
		bookCountBySeries.set(series, (bookCountBySeries.get(series) ?? 0) + 1);
	}

	return [...bookCountBySeries.entries()]
		.map(([name, bookCount]) => ({ name, bookCount }))
		.sort((a, b) => a.name.localeCompare(b.name));
};
