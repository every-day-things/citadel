/**
 * Pure index <-> row/column math for the virtualized cover grid
 * (BookGrid.tsx). The virtualizer windows whole shelf rows; these helpers
 * translate between flat book indices and rows so the grid keeps consuming
 * a plain indexed array (backend pagination can swap in later without
 * touching this math).
 */

export interface ColumnMetrics {
	/** Width available to grid tracks (container width minus horizontal padding). */
	availableWidth: number;
	minColumnWidth: number;
	columnGap: number;
}

/**
 * How many columns fit, matching CSS `repeat(auto-fill, minmax(min, 1fr))`:
 * the browser fits as many `min`-wide tracks as possible (gaps between
 * them), then stretches each to share the leftover. Always at least 1.
 */
export const computeColumnCount = ({
	availableWidth,
	minColumnWidth,
	columnGap,
}: ColumnMetrics): number => {
	if (minColumnWidth <= 0) return 1;
	const fit = Math.floor(
		(availableWidth + columnGap) / (minColumnWidth + columnGap),
	);
	return Math.max(fit, 1);
};

export const computeRowCount = (itemCount: number, columns: number): number => {
	if (columns <= 0 || itemCount <= 0) return 0;
	return Math.ceil(itemCount / columns);
};

/** Which row a flat item index lives in. */
export const rowOfIndex = (index: number, columns: number): number =>
	Math.floor(Math.max(index, 0) / Math.max(columns, 1));

export interface RowSlice {
	/** Inclusive start index into the flat item array. */
	start: number;
	/** Exclusive end index — safe to pass straight to Array.prototype.slice. */
	end: number;
}

/** The flat-array slice of items belonging to one row. */
export const rowSlice = (
	row: number,
	columns: number,
	itemCount: number,
): RowSlice => {
	const safeColumns = Math.max(columns, 1);
	const start = Math.min(row * safeColumns, itemCount);
	const end = Math.min(start + safeColumns, itemCount);
	return { start, end };
};
