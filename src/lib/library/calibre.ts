import {
  commands,
  type CalibreClientConfig,
  type ImportableFile,
  type ImportableBookMetadata,
  type LibraryBook,
} from "../../bindings";
import type { Library, Options } from "./typesLibrary";

const genListBooks = (config: CalibreClientConfig) => async () => {
  const results = commands.calibreLoadBooksFromDb(config.library_path);
  return results;
};

export const initCalibreClient = async (options: Options): Promise<Library> => {
  if (options.connectionType === "remote") {
    throw new Error("Remote connection not implemented");
  }

  const config = await commands.initClient(options.libraryPath);

  return {
    listBooks: genListBooks(config),
    sendToDevice: async (book, deviceOptions) => {
      await commands.addBookToExternalDrive(deviceOptions.path, book);
    },
    updateBook: async (bookId, updates) => {
      await commands.updateBook(
        options.libraryPath,
        bookId,
        updates.title ?? ""
      );
    },

    checkFileImportable: async (filePath: string) => {
      const result = await commands.checkFileImportable(filePath);
      return result;
    },
    getImportableFileMetadata: async (importableFile: ImportableFile) => {
      const result = await commands.getImportableFileMetadata(importableFile);
      return result;
    },
    addImportableFileByMetadata: async (metadata: ImportableBookMetadata) => {
      await commands.addBookToDbByMetadata(options.libraryPath, metadata);
      return undefined;
    },
  };
};
