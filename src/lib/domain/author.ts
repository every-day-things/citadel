import { LibraryAuthor } from "@/bindings";

export const sortAuthors = (a: LibraryAuthor, b: LibraryAuthor) => {
	return a.sortable_name.localeCompare(b.sortable_name);
};
