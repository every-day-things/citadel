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
