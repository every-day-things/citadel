import type {
	AuthorUpdate,
	BookUpdate,
	ImportableBookMetadata,
	ImportableFile,
	LibraryAuthor,
	LibraryBook,
} from "@/bindings";

export const DeviceType = {
	externalDrive: "EXTERNAL_DRIVE",
} as const;
export type TDeviceType = (typeof DeviceType)[keyof typeof DeviceType];
export interface FileType {
	extension: string;
	mimetype: string;
}

export interface Library {
	listBooks(): Promise<LibraryBook[]>;
	listAuthors(): Promise<LibraryAuthor[]>;
	sendToDevice(
		book: LibraryBook,
		deviceOptions: {
			type: TDeviceType;
		} & {
			type: "EXTERNAL_DRIVE";
			path: string;
		},
	): Promise<void>;
	updateBook(bookId: string, updates: BookUpdate): Promise<void>;
	updateAuthor(bookId: string, updates: AuthorUpdate): Promise<void>;
	deleteAuthor(authorId: string): Promise<void>;
	deleteBookIdentifier(bookId: string, identifierId: number): Promise<void>;
	upsertBookIdentifier(
		bookId: string,
		identifierId: number | null,
		label: string,
		value: string,
	): Promise<void>;

	/**
	 * Returns the path to the cover image for the book with the given ID.
	 *
	 * Only useful for Local libraries, required to be sync so that it can be
	 * used in the `src` attribute of an `<img>` tag or as the icon in a
	 * `startDrag` call.
	 * @param book_id Book to retrieve the cover for.
	 */
	getCoverPathForBook(book_id: LibraryBook["id"]): string | undefined;
	/**
	 * Returns an asset URL for the cover image for the book with the given ID.
	 *
	 * @param book_id Book to retrieve the cover for.
	 */
	getCoverUrlForBook(book_id: LibraryBook["id"]): string | undefined;

	/**
	 * Returns the absolute path for the default file for ID'ed book.
	 *
	 * Only useful for Local Libraries, required to be sync so that it can be
	 * used in the `startDrag` call.
	 * @param book_id Book to retrieve the file for.
	 */
	getDefaultFilePathForBook(book_id: LibraryBook["id"]): string | undefined;

	/**
	 * Return an ImportableFile if the file at `filePath` can be added to the library.
	 * @param filePath
	 */
	checkFileImportable(filePath: string): Promise<ImportableFile | undefined>;
	/**
   * Gets Metadata for a file that can be imported.

   * `ImportableFile` is used to ensure that the file can be imported:
   * see {@link Library#checkFileImportable} for more details.

   * @param importableFile
   */
	getImportableFileMetadata(
		importableFile: ImportableFile,
	): Promise<ImportableBookMetadata | undefined>;
	/**
	 * Adds a file to the library.
	 *
	 * Users can edit `metadata` before calling this function. For example, they
	 * can change the title of the book before it's added to the DB.
	 *
	 * `ImportableBookMetadata` is used to ensure that the file can be imported:
	 * see {@link Library#getImportableFileMetadata} for more details.
	 *
	 * @param metadata
	 */
	addImportableFileByMetadata(
		metadata: ImportableBookMetadata,
	): Promise<LibraryBook["id"] | undefined>;

	/**
	 * Returns a list of valid file extensions & mimetypes for files users want to
	 * add to their library.
	 */
	listValidFileTypes(): Promise<FileType[]>;
}

export interface LocalConnectionOptions {
	connectionType: "local";
	libraryPath: string;
}
export interface RemoteConnectionOptions {
	connectionType: "remote";
	url: string;
}

export type Options = {
	libraryType: "calibre";
} & (LocalConnectionOptions | RemoteConnectionOptions);
