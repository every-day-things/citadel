import initSqlJs from "sql.js";

import { LibraryBook } from "@/bindings";

import { Library, WebConnectionOptions } from "../_types";
import { loadDb } from "./web/db";
import {
	createAuthorRepository,
	createBookAuthorLinkRepository,
	createBookRepository,
} from "./web/repositories/sqljs";
import { createCatalogService } from "./web/services/catalog";
import { createAuthorService } from "./web/services/author";
import { libraryAuthor } from "./web/entities/LibraryAuthor";

export const genWebCalibreClient = async (
	options: WebConnectionOptions,
): Promise<Library> => {
	const SQL = await initSqlJs({
		// TODO: Now Citadel requires being online on the web? ... that is probably fine, yes.
		locateFile: (file: string) => `https://sql.js.org/dist/${file}`,
	});
	const bookRepo = createBookRepository(options.libraryDirectoryHandle, SQL);
	const bookAuthorLinkRepo = createBookAuthorLinkRepository(
		options.libraryDirectoryHandle,
		SQL,
	);
	const authorRepo = createAuthorRepository(
		options.libraryDirectoryHandle,
		SQL,
	);
	const authorService = createAuthorService(authorRepo);
	const catalogService = createCatalogService(
		bookRepo,
		bookAuthorLinkRepo,
		authorRepo,
	);

	return {
		listBooks: async () => {
			const db = await loadDb(options.libraryDirectoryHandle, SQL);
			if (!db) return [];

			const res = db.exec("SELECT * FROM 'books'");
			if (res.length === 0) {
				return [];
			}
			const rows = res[0].values;

			const coverImagePromises = rows.map((row) => {
				const path = (row[9] ?? "").toString();
				if (path === "") {
					return null;
				}
				return coverImageFromPath(path, options.libraryDirectoryHandle);
			});
			const coverImages = await Promise.all(coverImagePromises);

			const addCoverImageToBook = (
				book: LibraryBook,
				coverImage: File | null,
			): LibraryBook => {
				if (coverImage === null) {
					return book;
				}
				return {
					...book,
					cover_image: {
						kind: "Remote",
						url: URL.createObjectURL(coverImage),
						local_path: null,
					},
				};
			};
			const books = (await catalogService.all()).map((book, index) =>
				addCoverImageToBook(book, coverImages[index]),
			);

			return books;
		},
		listAuthors: async () => {
			return (await authorService.all()).map(libraryAuthor.fromAuthor);
		},
		listValidFileTypes: () => {
			return Promise.resolve([]);
		},
		getCoverPathForBook: () => {
			throw new Error("Not implemented");
		},
		getCoverUrlForBook: () => {
			throw new Error("Not implemented");
		},
		getDefaultFilePathForBook: () => {
			throw new Error("Not implemented");
		},
		getImportableFileMetadata: () => {
			throw new Error("Not implemented");
		},
		sendToDevice: () => {
			throw new Error("Not implemented");
		},
		updateBook: () => {
			throw new Error("Not implemented");
		},
		addImportableFileByMetadata: () => {
			throw new Error("Not implemented");
		},
		checkFileImportable: () => {
			throw new Error("Not implemented");
		},
	};
};

const coverImageFromPath = async (
	path: string,
	libraryDirectoryHandle: FileSystemDirectoryHandle,
): Promise<File | null> => {
	const parts = path.split("/");
	const maxDepth = parts.length;
	let currDepth = 0;
	let handle: FileSystemDirectoryHandle | FileSystemFileHandle | null =
		libraryDirectoryHandle;

	while (currDepth < maxDepth) {
		try {
			// File names can be invalid, which throws an error.
			handle = await handle.getDirectoryHandle(parts[currDepth]);
		} catch (e) {
			console.log(e, handle, parts[currDepth], parts, currDepth);
			handle = null;
			break;
		}
		if (handle === null) {
			break;
		}
		currDepth++;
	}

	if (handle === null) {
		return null;
	}
	try {
		// Getting the cover image can throw errors
		const fileHandle = await handle.getFileHandle("cover.jpg");
		return fileHandle.getFile();
	} catch (e) {
		return null;
	}
};
