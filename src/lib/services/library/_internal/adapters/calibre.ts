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
		sendToDevice: () => {
			throw new Error("Not implemented");
		},
		updateBook: async (bookId, updates) => {
			await commands.clbCmdUpdateBook(options.libraryPath, bookId, updates);
		},
		updateAuthor: async (authorId, updates) => {
			await commands.clbCmdUpdateAuthor(options.libraryPath, authorId, updates);
		},
		deleteAuthor: async (authorId) => {
			await commands.clbCmdDeleteAuthor(options.libraryPath, authorId);
			return;
		},
		upsertBookIdentifier: async (bookId, identifierId, label, value) => {
			await commands.clbCmdUpsertBookIdentifier(
				options.libraryPath,
				bookId,
				label,
				value,
				identifierId,
			);
		},
		deleteBookIdentifier: async (bookId, identifierId) => {
			await commands.clbCmdDeleteBookIdentifier(
				options.libraryPath,
				bookId,
				identifierId,
			);
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
