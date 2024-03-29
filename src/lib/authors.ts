import { LibraryAuthor } from "@/bindings";

/**
 * Formats a list of authors as one string that can be displayed to a user.
 * @param authors
 * @returns
 *
 * @example
 * ```tsx
 * const authors = [
 *  { name: "Tris NoBoilerplate" },
 *  { name: "Robert Pirzig" }
 * ];
 * formatAuthorList(authors); // "Tris NoBoilerplate, Robert Pirzig"
 * ```
 */
export const formatAuthorList = (authors: LibraryAuthor[]) => {
	return authors.map((author) => author.name).join(", ");
};
