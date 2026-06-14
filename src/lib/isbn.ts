export const normalizeIsbn = (raw: string): string | undefined => {
	const trimmed = raw.trim();
	if (!trimmed) return undefined;

	const withoutPrefix = trimmed.toLowerCase().startsWith("isbn:")
		? trimmed.slice("isbn:".length).trim()
		: trimmed;

	const compact = withoutPrefix.replace(/[^0-9xX]/g, "").toUpperCase();
	if (/^\d{13}$/.test(compact)) return compact;
	if (/^\d{9}[\dX]$/.test(compact)) return compact;
	return undefined;
};

/**
 * Canonicalize any valid ISBN to its 13-digit form, so the ISBN-10 and ISBN-13
 * representations of one edition compare equal. Returns undefined for invalid
 * input. (Fuzzy provider-side matching stays in Rust; this is only for
 * display-side dedupe and pinning, where a file may carry an ISBN-10.)
 */
export const toIsbn13 = (raw: string): string | undefined => {
	const normalized = normalizeIsbn(raw);
	if (!normalized) return undefined;
	if (normalized.length === 13) return normalized;

	const core = `978${normalized.slice(0, 9)}`;
	let sum = 0;
	for (let i = 0; i < 12; i += 1) {
		const digit = core.charCodeAt(i) - 48;
		sum += i % 2 === 0 ? digit : digit * 3;
	}
	const check = (10 - (sum % 10)) % 10;
	return `${core}${check}`;
};

/**
 * Whether two ISBN strings denote the same edition, across the ISBN-10 and
 * ISBN-13 forms. Used for display-side dedupe and ISBN pinning.
 */
export const isbnEquivalent = (
	a: string | null | undefined,
	b: string | null | undefined,
): boolean => {
	if (!a || !b) return false;
	const ca = toIsbn13(a);
	return ca !== undefined && ca === toIsbn13(b);
};
