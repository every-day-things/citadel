import type { LibraryBook } from "./bindings";

export interface BookView {
	loading: boolean;
	bookList: LibraryBook[];
	onBookOpen: (bookId: LibraryBook["id"]) => void;
	selectedBookId?: LibraryBook["id"] | null;
}
