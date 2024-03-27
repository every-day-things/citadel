import type { ComboboxOptionProps } from "@melt-ui/svelte";
import type { LibraryAuthor } from "../../../bindings";

export const toComboboxOption = (
	author: LibraryAuthor,
): ComboboxOptionProps<LibraryAuthor> => ({
	value: author,
	label: author.name,
	disabled: false,
});

export const filterAuthorsByTerm = (
	authors: LibraryAuthor[],
	term: string,
): LibraryAuthor[] => {
	const lowerCaseTerm = term.toLowerCase();
	return authors.filter(
		(author) =>
			author.name.toLowerCase().includes(lowerCaseTerm) ||
			author.id.toLowerCase().includes(lowerCaseTerm),
	);
};
