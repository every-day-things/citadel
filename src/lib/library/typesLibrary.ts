import type { CalibreBook, ImportableBookMetadata, ImportableFile, LibraryBook } from "../../bindings";

export const DeviceType = {
  externalDrive: "EXTERNAL_DRIVE",
} as const;
export type TDeviceType = typeof DeviceType[keyof typeof DeviceType];

export type Library = {
  listBooks(): Promise<CalibreBook[]>;
  sendToDevice(book: LibraryBook, deviceOptions: {
    type: TDeviceType;
  } & {
    type: "EXTERNAL_DRIVE";
    path: string;
  } ): Promise<void>;
  updateBook(bookId: string, updates: Partial<LibraryBook>): Promise<void>;

  checkFileImportable(filePath: string): Promise<ImportableFile | undefined>;
  getImportableFileMetadata(importableFile: ImportableFile): Promise<ImportableBookMetadata | undefined>;
  addImportableFileByMetadata(metadata: ImportableBookMetadata): Promise<LibraryBook["id"] | undefined>;
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
