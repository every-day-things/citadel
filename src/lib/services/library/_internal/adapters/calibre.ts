import initSqlJs, { Database } from "sql.js";

import {
	commands,
	type ImportableFile,
	type ImportableBookMetadata,
	type LibraryBook,
	type RemoteFile,
} from "@/bindings";
import type {
	Library,
	LocalConnectionOptions,
	Options,
	RemoteConnectionOptions,
	WebConnectionOptions,
} from "../_types";

const genLocalCalibreClient = async (
	options: LocalConnectionOptions,
): Promise<Library> => {
	const config = await commands.initClient(options.libraryPath);
	const bookCoverCache = new Map<
		LibraryBook["id"],
		{
			localPath: string;
			url: string;
		}
	>();
	const bookFilePath = new Map<
		LibraryBook["id"],
		{
			localPath: string;
			url: undefined;
		}
	>();

	return {
		listBooks: async () => {
			const results = await commands.clbQueryListAllBooks(config.library_path);

			for (const book of results) {
				bookCoverCache.set(book.id.toString(), {
					localPath: book.cover_image?.local_path ?? "",
					url: book.cover_image?.url ?? "",
				});
				if (book.file_list.length === 0) {
					return [];
				}

				const primaryFile = book.file_list[0];
				if ("Local" in primaryFile) {
					bookFilePath.set(book.id.toString(), {
						localPath: primaryFile.Local.path,
						url: undefined,
					});
				}
			}

			return results;
		},
		listAuthors() {
			return commands.clbQueryListAllAuthors(config.library_path);
		},
		sendToDevice: async (book, deviceOptions) => {
			await commands.calibreSendToDevice(
				config.library_path,
				deviceOptions.path,
				book,
			);
		},
		updateBook: async (bookId, updates) => {
			await commands.clbCmdUpdateBook(options.libraryPath, bookId, updates);
		},
		getCoverPathForBook: (bookId) => {
			return bookCoverCache.get(bookId)?.localPath;
		},
		getCoverUrlForBook: (bookId) => {
			return bookCoverCache.get(bookId)?.url;
		},
		getDefaultFilePathForBook: (bookId) => {
			return bookFilePath.get(bookId)?.localPath;
		},

		checkFileImportable: async (filePath: string) => {
			const result =
				(await commands.clbQueryIsFileImportable(filePath)) ?? undefined;
			return result;
		},
		getImportableFileMetadata: async (importableFile: ImportableFile) => {
			const result =
				(await commands.clbQueryImportableFileMetadata(importableFile)) ??
				undefined;
			return result;
		},
		addImportableFileByMetadata: async (metadata: ImportableBookMetadata) => {
			await commands.clbCmdCreateBook(options.libraryPath, metadata);
			return undefined;
		},
		listValidFileTypes: async () => {
			const result = await commands.clbQueryListAllFiletypes();
			return result.map(([mimetype, extension]) => ({
				extension,
				mimetype,
			}));
		},
	};
};

const genRemoteCalibreClient = async (
	options: RemoteConnectionOptions,
	// The interface requires this function to be async.
	// eslint-disable-next-line @typescript-eslint/require-await
): Promise<Library> => {
	// All remote clients are really Citadel clients... but for a certain kind of
	// library. In this case, Calibre.
	const baseUrl = options.url;

	const bookCache = new Map<LibraryBook["id"], LibraryBook>();

	return {
		listBooks: async () => {
			const res = await fetch(`${baseUrl}/books`)
				.then((res) => res.json() as unknown as { items: LibraryBook[] })
				.then((res) => res.items)
				.then((res) => {
					return res;
				});

			for (const book of res) {
				bookCache.set(book.id, book);
			}

			return res;
		},
		listAuthors() {
			throw new Error("Not implemented");
		},
		sendToDevice: () => {
			throw new Error("Not implemented");
		},
		updateBook: () => {
			throw new Error("Not implemented");
		},
		// The interface requires we accept param.
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		getCoverPathForBook: (_bookId) => {
			return "";
		},
		getCoverUrlForBook(bookId) {
			const url = bookCache.get(bookId)?.cover_image?.url;
			return url;
		},
		getDefaultFilePathForBook: (bookId) => {
			const fileList = bookCache.get(bookId)?.file_list ?? [];
			const remoteFiles = fileList
				.map((file) => ("Remote" in file ? file.Remote : undefined))
				.filter((file): file is RemoteFile => file !== undefined);
			const urls = remoteFiles.map((file) => file.url);
			return urls.at(0);
		},
		checkFileImportable: () => {
			throw new Error("Not implemented");
		},
		getImportableFileMetadata: () => {
			throw new Error("Not implemented");
		},
		addImportableFileByMetadata: () => {
			throw new Error("Not implemented");
		},
		// The interface requires this function is async.
		// eslint-disable-next-line @typescript-eslint/require-await
		listValidFileTypes: async () => {
			throw new Error("Not implemented");
		},
	};
};

const genWebCalibreClient = async (
	options: WebConnectionOptions,
	// The interface requires this function to be async.
	// eslint-disable-next-line @typescript-eslint/require-await
): Promise<Library> => {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	const SQL = await initSqlJs({
		// TODO: Now Citadel requires being online on the web? ... that is probably fine, yes.
		locateFile: (file: string) => `https://sql.js.org/dist/${file}`, });
	const loadDb = async (): Promise<Database> => {
		const fileBuffer = await (
			await (
				await options.libraryDirectoryHandle.getFileHandle("metadata.db", {
					create: false,
				})
			).getFile()
		).arrayBuffer();

		const db = new SQL.Database(new Uint8Array(fileBuffer));

		return db;
	};

	console.log("Connecting to Calibre from the Web");

	return {
		listBooks: async () => {
			const db = await loadDb();
			const res = db.exec("SELECT * FROM 'books'");
			if (res.length === 0) {
				return [];
			}

			const books = res[0].values.map((row): LibraryBook => ({
				id: row[0]?.toString()?? '',
				title: row[1]?.toString() ?? '',
				author_list: [{
					sortable_name: '',
					name: '',
					id: ''
				}],
				uuid: null,
				sortable_title: '',
				author_sort_lookup: {},
				file_list: [],
				cover_image: null,
				identifier_list: [],
			}));

			console.log({ res, books });
			return books;
		},
	} as unknown as Library;
};

export const initCalibreClient = async (options: Options): Promise<Library> => {
	if (options.connectionType === "remote") {
		return genRemoteCalibreClient(options);
	}
	if (options.connectionType === "web") {
		return genWebCalibreClient(options);
	}

	return genLocalCalibreClient(options);
};
