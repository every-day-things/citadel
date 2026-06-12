import type { LibraryBook } from "./bindings";

export interface BookView {
	loading: boolean;
	/**
	 * Indexed array of the filtered library: length is the total match
	 * count, `undefined` entries are books whose page has not been fetched
	 * yet (they render as placeholders).
	 */
	bookList: (LibraryBook | undefined)[];
	onBookOpen: (bookId: LibraryBook["id"]) => void;
	selectedBookId?: LibraryBook["id"] | null;
}
