import {
	commands,
	type ImportableFile,
	type ImportableBookMetadata,
	type LibraryBook,
	type RemoteFile,
	NewAuthor,
} from "@/bindings";
import type {
	Library,
	LocalConnectionOptions,
	Options,
	RemoteConnectionOptions,
} from "../_types";

const genLocalCalibreClient = async (
	options: LocalConnectionOptions,
): Promise<Library> => {
	const configResult = await commands.initClient(options.libraryPath);
	if (configResult.status === "error") {
		throw new Error(configResult.error);
	}

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
		createAuthors: async (authorList: NewAuthor[]) => {
			const results = await commands.clbCmdCreateAuthors(authorList);
			if (results.status === "error") {
				throw new Error(results.error);
			}
			return results.data;
		},
		listBooks: async () => {
			const results = await commands.clbQueryListAllBooks();
			if (results.status === "error") {
				throw new Error(results.error);
			}
			const books = results.data;

			for (const book of books) {
				bookCoverCache.set(book.id.toString(), {
					localPath: book.cover_image?.local_path ?? "",
					url: book.cover_image?.url ?? "",
				});
				if (book.file_list[0] === undefined) {
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

			return books;
		},
		listAuthors: async () => {
			const results = await commands.clbQueryListAllAuthors();
			if (results.status === "error") {
				throw new Error(results.error);
			}
			return results.data;
		},
		sendToDevice: () => {
			throw new Error("Not implemented");
		},
		updateBook: async (bookId, updates) => {
			const result = await commands.clbCmdUpdateBook(bookId, updates);
			if (result.status === "error") {
				throw new Error(result.error);
			}
		},
		updateAuthor: async (authorId, updates) => {
			const result = await commands.clbCmdUpdateAuthor(authorId, updates);
			if (result.status === "error") {
				throw new Error(result.error);
			}
		},
		deleteAuthor: async (authorId) => {
			const result = await commands.clbCmdDeleteAuthor(authorId);
			if (result.status === "error") {
				throw new Error(result.error);
			}
		},
		upsertBookIdentifier: async (bookId, identifierId, label, value) => {
			const result = await commands.clbCmdUpsertBookIdentifier(
				bookId,
				label,
				value,
				identifierId,
			);
			if (result.status === "error") {
				throw new Error(result.error);
			}
		},
		deleteBookIdentifier: async (bookId, identifierId) => {
			const result = await commands.clbCmdDeleteBookIdentifier(bookId, identifierId);
			if (result.status === "error") {
				throw new Error(result.error);
			}
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
			const result = await commands.clbCmdCreateBook(metadata);
			if (result.status === "error") {
				throw new Error(result.error);
			}
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
		createAuthors() {
			throw new Error("Not implemented");
		},
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
		updateAuthor: () => {
			throw new Error("Not implemented");
		},
		deleteAuthor: () => {
			throw new Error("Not implemented");
		},
		upsertBookIdentifier: () => {
			throw new Error("Not implemented");
		},
		deleteBookIdentifier: () => {
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

export const initCalibreClient = async (options: Options): Promise<Library> => {
	if (options.connectionType === "remote") {
		return genRemoteCalibreClient(options);
	}

	return genLocalCalibreClient(options);
};
