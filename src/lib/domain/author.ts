import { LibraryAuthor } from "@/bindings";

export const sortAuthors = (a: LibraryAuthor, b: LibraryAuthor) => {
	const nameA = a.sortable_name || a.name;
	const nameB = b.sortable_name || b.name;

	return nameA.localeCompare(nameB);
};
