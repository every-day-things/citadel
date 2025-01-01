/**
 * Selects an item from an array using a string as a key.
 *
 * @param options - Array of options to select from
 * @param key - String key used for selection
 * @returns Selected item from the array
 */
export const selectByStringHash = <T>(options: T[], key: string): T => {
	if (!Array.isArray(options) || options.length === 0) {
		throw new Error("Options must be a non-empty array");
	}
	if (typeof key !== "string") {
		throw new Error("Key must be a string");
	}

	const hash = hashString(key);
	const index = hash % options.length;
	return options[index];
};

/**
 * Creates a simple hash from a string.
 * @param str - Input string to hash
 * @returns Hash value
 */
const hashString = (str: string) => {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32-bit integer
	}
	return Math.abs(hash);
};
