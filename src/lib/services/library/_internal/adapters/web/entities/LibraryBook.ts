import { LibraryBook, LibraryAuthor } from "@/bindings";
import { Book } from "./Book";

export const libraryBook = {
	fromRow: (row: any[]): LibraryBook => {
		return {
			id: row[0]?.toString() ?? "",
			title: row[1]?.toString() ?? "",
			author_list: [
				{
					sortable_name: "",
					name: "",
					id: "",
				},
			],
			uuid: null,
			sortable_title: "",
			author_sort_lookup: {},
			file_list: [],
			cover_image: null,
			identifier_list: [],
		};
	},
	fromBookAndAuthorList: (
		book: Book,
		authorList: LibraryAuthor[],
	): LibraryBook => {
		return {
			id: book.id.toString(),
			title: book.title,
			author_list: authorList,
			uuid: book.uuid ?? null,
			sortable_title: book.sort ?? "",
			author_sort_lookup: {},
			file_list: [],
			cover_image: null,
			identifier_list: [],
		};
	},
};
