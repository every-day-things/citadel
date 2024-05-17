import initSqlJs, { Database, SqlJsStatic } from "sql.js";

import { LibraryAuthor, LibraryBook } from "@/bindings";

import { Library, WebConnectionOptions } from "../_types";
import { isDefined } from "@/lib/isDefined";

const libraryBook = {
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

const libraryAuthor = {
	fromAuthor: (author: Author): LibraryAuthor => {
		return {
			id: author.id.toString(),
			name: author.name,
			sortable_name: "",
		};
	},
};

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
				const path = row[9].toString();
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
	} as unknown as Library;
};

const loadDb = async (
	libraryDirectoryHandle: FileSystemDirectoryHandle,
	sqlClient: SqlJsStatic,
): Promise<Database | null> => {
	try {
		const fileBuffer = await (
			await (
				await libraryDirectoryHandle.getFileHandle("metadata.db", {
					create: false,
				})
			).getFile()
		).arrayBuffer();
		return new sqlClient.Database(new Uint8Array(fileBuffer));
	} catch (e) {
		console.error(e);
		return null;
	}
};

export type AuthorId = string & { readonly __brand: "AuthorId" };
export type BookId = string & { readonly __brand: "BookId" };

export interface Book {
	id: number;
	uuid?: string;
	title: string;
	sort?: string;
	timestamp?: Date;
	pubdate?: Date;
	series_index: number;
	author_sort?: string;
	path: string;
	flags: number;
	has_cover?: boolean;
	last_modified: Date;
}

const Book = {
	fromRow: (row: any[]): Book => {
		return {
			id: row[0].toString() as BookId,
			uuid: row[1],
			title: row[2],
			sort: row[3],
			timestamp: row[4],
			pubdate: row[5],
			series_index: row[6],
			author_sort: row[7],
			path: row[8],
			flags: row[9],
			has_cover: row[10],
			last_modified: row[11],
		};
	},
};

export interface Author {
	id: AuthorId;
	name: string;
}

const Author = {
	fromRow: (row: any[]): Author => {
		return {
			id: row[0].toString() as AuthorId,
			name: row[1],
		};
	},
};

const createBookAuthorLinkRepository = (
	directoryHandle: FileSystemDirectoryHandle,
	sqlClient: SqlJsStatic,
) => {
	return {
		getAuthorsForBook: async (bookId: number) => {
			const db = await loadDb(directoryHandle, sqlClient);
			if (!db) throw new Error("No database");

			const res = db.exec(
				`SELECT author FROM 'books_authors_link' WHERE book = ${bookId}`,
			);
			return res[0].values.map((row) => row[0].toString() as AuthorId);
		},
	};
};

const createAuthorRepository = (
	directoryHandle: FileSystemDirectoryHandle,
	sqlClient: SqlJsStatic,
) => {
	return {
		all: async (): Promise<Author[]> => {
			const db = await loadDb(directoryHandle, sqlClient);
			if (!db) return [];

			const res = db.exec("SELECT * FROM 'authors'");
			if (res.length === 0) {
				return [];
			}
			const rows = res[0].values.map(Author.fromRow);
			return rows;
		},
	};
};

const createBookRepository = (
	directoryHandle: FileSystemDirectoryHandle,
	sqlClient: SqlJsStatic,
) => {
	return {
		all: async (): Promise<Book[]> => {
			const db = await loadDb(directoryHandle, sqlClient);
			if (!db) return [];

			const res = db.exec("SELECT * FROM 'books'");
			if (res.length === 0) {
				return [];
			}
			const rows = res[0].values.map(Book.fromRow);
			return rows;
		},
	};
};

const createCatalogService = (
	bookRepository: ReturnType<typeof createBookRepository>,
	bookAuthorLinkRepository: ReturnType<typeof createBookAuthorLinkRepository>,
	authorRepository: ReturnType<typeof createAuthorRepository>,
) => {
	const authorsForBook = async (bookId: number): Promise<AuthorId[]> => {
		return bookAuthorLinkRepository.getAuthorsForBook(bookId);
	};

	return {
		all: async (): Promise<LibraryBook[]> => {
			const books = await bookRepository.all();
			const authors = await authorRepository.all();
			const authorLookup = new Map<AuthorId, Author>(
				authors.map((author) => [author.id, author]),
			);

			const libraryBooks = books.map(async (book) => {
				const bookLibraryAuthors = (await authorsForBook(book.id))
					.map((id) => authorLookup.get(id))
					.filter(isDefined)
					.map(libraryAuthor.fromAuthor);

				return libraryBook.fromBookAndAuthorList(book, bookLibraryAuthors);
			});

			return Promise.all(libraryBooks);
		},
		authorsForBook,
	};
};

const createAuthorService = (
	authorRepository: ReturnType<typeof createAuthorRepository>,
) => {
	return {
		all: async (): Promise<Author[]> => {
			return authorRepository.all();
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
