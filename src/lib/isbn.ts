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
