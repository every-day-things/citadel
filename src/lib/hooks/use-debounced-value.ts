import { useEffect, useState } from "react";

/**
 * Returns `value`, but only after it has been stable for `delayMs`.
 *
 * Used to keep the library search field instant while the debounced text is
 * what becomes a new paged-query cache key (each distinct key costs a
 * backend fetch).
 */
export const useDebouncedValue = <TValue>(
	value: TValue,
	delayMs: number,
): TValue => {
	const [debounced, setDebounced] = useState(value);

	useEffect(() => {
		const timer = window.setTimeout(() => setDebounced(value), delayMs);
		return () => window.clearTimeout(timer);
	}, [value, delayMs]);

	return debounced;
};
