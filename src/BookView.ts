import { LibraryBook } from "./bindings";

export interface BookView {
	loading: boolean;
	bookList: LibraryBook[];
	onBookOpen: (bookId: LibraryBook["id"]) => void;
}
