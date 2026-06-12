import type { LibraryTag } from "@/bindings";

/** Tag names for the tag autocomplete, locale-sorted ascending. */
export const sortedTagNames = (tags: Pick<LibraryTag, "name">[]): string[] =>
	tags.map((tag) => tag.name).sort((left, right) => left.localeCompare(right));

/**
 * Whether a save's `tag_list` differs from the book's current tags (order
 * ignored). `null` means "tags untouched" in a `BookUpdate`. Used to skip
 * re-fetching the tag vocabulary after saves that cannot have changed it.
 */
export const tagListChanged = (
	current: readonly string[],
	next: readonly string[] | null,
): boolean => {
	if (next === null) {
		return false;
	}
	if (next.length !== current.length) {
		return true;
	}
	const currentSet = new Set(current);
	return next.some((name) => !currentSet.has(name));
};
