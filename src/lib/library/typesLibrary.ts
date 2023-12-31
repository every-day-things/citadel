import type {
  CalibreBook,
  ImportableBookMetadata,
  ImportableFile,
  LibraryBook,
} from "../../bindings";

export const DeviceType = {
  externalDrive: "EXTERNAL_DRIVE",
} as const;
export type TDeviceType = (typeof DeviceType)[keyof typeof DeviceType];

export type Library = {
  listBooks(): Promise<CalibreBook[]>;
  sendToDevice(
    book: LibraryBook,
    deviceOptions: {
      type: TDeviceType;
    } & {
      type: "EXTERNAL_DRIVE";
      path: string;
    }
  ): Promise<void>;
  updateBook(bookId: string, updates: Partial<LibraryBook>): Promise<void>;

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
    importableFile: ImportableFile
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
    metadata: ImportableBookMetadata
  ): Promise<LibraryBook["id"] | undefined>;
};

export type LocalConnectionOptions = {
  connectionType: "local";
  libraryPath: string;
};
export type RemoteConnectionOptions = {
  connectionType: "remote";
  url: string;
};

export type Options =
  | {
      libraryType: "calibre";
    } & (LocalConnectionOptions | RemoteConnectionOptions);
