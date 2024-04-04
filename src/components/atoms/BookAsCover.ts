import { open } from "@tauri-apps/api/shell";
import type { LibraryBook } from "../../bindings";
import { libraryClient } from "../../stores/library";
import { DeviceType } from "@/lib/services/library/_types";

export const openBookInDefaultApp = (book: LibraryBook) => {
	const bookAbsPath = libraryClient().getDefaultFilePathForBook(book.id);
	if (!bookAbsPath) {
		console.error("No default file path for book", book);
		return;
	}

	open(bookAbsPath);
};

export const getBookDownloadUrl = (book: LibraryBook): string | undefined => {
	const bookAbsPath = libraryClient().getDefaultFilePathForBook(book.id);
	if (!bookAbsPath) {
		console.error("Cannot download book", book);
		return;
	}

	return bookAbsPath;
};

export const shortenToChars = (str: string, maxChars: number) =>
	str.length > maxChars ? `${str.substring(0, maxChars)}...` : str;

export const sendToDevice = async (book: LibraryBook, devicePath: string) => {
	libraryClient().sendToDevice(book, {
		type: DeviceType.externalDrive,
		path: devicePath,
	});
};
