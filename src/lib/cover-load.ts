/**
 * Pure decision logic for whether a cover `<img>` actually produced pixels
 * (BookCover.tsx).
 *
 * Failure is not always an `error` event: when an asset:// URL is outside the
 * webview's asset scope (e.g. restored settings point at a library folder the
 * user never re-picked), WebKit fires `load` with a zero-size image instead.
 * Because grid row height derives from the image's intrinsic size, such a
 * "successful" zero-size load collapses virtualized row measurement — so it
 * must be treated as a failure and fall back to the placeholder cover.
 */

export type CoverLoadResolution = "loaded" | "failed";

interface ImageNaturalSize {
	naturalWidth: number;
	naturalHeight: number;
}

/**
 * Classifies a cover image's `load` event: only an image with real intrinsic
 * dimensions counts as loaded; a 0×0 "load" is a failure in disguise.
 */
export const resolveCoverLoad = (img: ImageNaturalSize): CoverLoadResolution =>
	img.naturalWidth > 0 && img.naturalHeight > 0 ? "loaded" : "failed";
