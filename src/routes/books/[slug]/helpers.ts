import type { Library } from "@/lib/services/library/_types";
import type { LibraryBook } from "../../../bindings";

export const pageTitleForBook = (book: LibraryBook) =>
	`"${book.title}" by ${book.author_list.map((item) => item.name).join(", ")}`;

export const getBookMatchingId = async (
	client: Library,
	id: LibraryBook["id"],
): Promise<LibraryBook> => {
	return (await client.listBooks()).filter(
		(book) => book.id.toString() === id,
	)[0];
};
