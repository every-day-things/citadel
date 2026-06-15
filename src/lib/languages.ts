/**
 * Language metadata helpers for the Edit Book page. Calibre stores languages
 * as ISO 639-2/3 codes (three letters, e.g. `eng`, `fra`); the UI shows the
 * English language name. This module maps between the two.
 *
 * The list is intentionally a curated set of common languages rather than the
 * full ISO register — it backs autocomplete suggestions and name↔code mapping.
 * Codes Citadel does not recognize still round-trip: an unknown code displays
 * as its uppercased self, and a free-typed value is lowercased back to a code.
 */

/** Curated `[code, English name]` pairs, ordered for the suggestion list. */
const LANGUAGES: ReadonlyArray<readonly [code: string, name: string]> = [
	["eng", "English"],
	["spa", "Spanish"],
	["fra", "French"],
	["deu", "German"],
	["ita", "Italian"],
	["por", "Portuguese"],
	["nld", "Dutch"],
	["rus", "Russian"],
	["pol", "Polish"],
	["swe", "Swedish"],
	["nor", "Norwegian"],
	["dan", "Danish"],
	["fin", "Finnish"],
	["ces", "Czech"],
	["ell", "Greek"],
	["tur", "Turkish"],
	["ara", "Arabic"],
	["heb", "Hebrew"],
	["hin", "Hindi"],
	["jpn", "Japanese"],
	["kor", "Korean"],
	["zho", "Chinese"],
	["ukr", "Ukrainian"],
	["ron", "Romanian"],
	["hun", "Hungarian"],
	["lat", "Latin"],
];

const NAME_BY_CODE = new Map(LANGUAGES.map(([code, name]) => [code, name]));
const CODE_BY_NAME = new Map(
	LANGUAGES.map(([code, name]) => [name.toLowerCase(), code]),
);

/** English language names, in suggestion order. */
export const KNOWN_LANGUAGE_NAMES: string[] = LANGUAGES.map(([, name]) => name);

/**
 * Display name for a stored language code. Unknown codes fall back to their
 * uppercased form so nothing is hidden from the user.
 *
 * @example languageNameForCode("fra") // "French"
 * @example languageNameForCode("cat") // "CAT"
 */
export const languageNameForCode = (code: string): string =>
	NAME_BY_CODE.get(code.trim().toLowerCase()) ?? code.trim().toUpperCase();

/**
 * Code for a language name as entered in the picker. Recognized names map to
 * their ISO 639-3 code; anything else (a code typed directly, or an unknown
 * name) is lowercased and trimmed so it still round-trips to the backend, which
 * canonicalizes it further.
 *
 * @example codeForLanguageName("French") // "fra"
 * @example codeForLanguageName("eng") // "eng"
 */
export const codeForLanguageName = (name: string): string => {
	const trimmed = name.trim();
	return CODE_BY_NAME.get(trimmed.toLowerCase()) ?? trimmed.toLowerCase();
};
