import { open } from "@tauri-apps/api/shell";
import type { LibraryBook } from "../../bindings";
import { libraryClient } from "../../stores/library";

export const openBookInDefaultApp = (book: LibraryBook) => {
	const bookAbsPath = libraryClient().getDefaultFilePathForBook(book.id);
	if (!bookAbsPath) {
		console.error("No default file path for book", book);
		return;
	}

	open(bookAbsPath).catch(console.error);
};

export const shortenToChars = (str: string, maxChars: number) =>
	str.length > maxChars ? `${str.substring(0, maxChars)}...` : str;
