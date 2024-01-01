import { joinSync } from "$lib/path";
import { convertFileSrc } from "@tauri-apps/api/tauri";
import {
  commands,
  type ImportableFile,
  type ImportableBookMetadata,
  type LibraryBook,
} from "../../bindings";
import type {
  Library,
  LocalConnectionOptions,
  Options,
  RemoteConnectionOptions,
} from "./typesLibrary";

const genLocalCalibreClient = async (
  options: LocalConnectionOptions
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
      const results = await commands.calibreLoadBooksFromDb(
        config.library_path
      );

      results.forEach((book) => {
        bookCoverCache.set(book.id.toString(), {
          localPath: joinSync(
            config.library_path,
            book.dir_rel_path,
            "cover.jpg"
          ),
          url: convertFileSrc(
            joinSync(config.library_path, book.dir_rel_path, "cover.jpg")
          ),
        });
        bookFilePath.set(book.id.toString(), {
          localPath: joinSync(
            config.library_path,
            book.dir_rel_path,
            book.filename
          ),
          url: undefined,
        });
      });

      const resultsAsLibraryBook = results.map((book): LibraryBook | Error => {
        const bookAbsPath = bookFilePath.get(book.id.toString())?.localPath
        if (bookAbsPath === undefined) {
          return new Error("Book path not found");
        };

        const bookAsLibraryBook: LibraryBook = {
          title: book.title,
          sortable_title: book.title,
          author_list: book.authors,
          absolute_path: bookAbsPath,
          filename: book.filename,
          id: book.id.toString(),
          uuid: book.id.toString(),

          file_list: [
            {
              path: bookAbsPath,
              mime_type: "",
            }
          ]
        };
        return bookAsLibraryBook
      }).filter((book): book is LibraryBook => {
        return !(book instanceof Error);
      });

      return resultsAsLibraryBook;
    },
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

const genRemoteCalibreClient = async (
  options: RemoteConnectionOptions
): Promise<Library> => {
  // All remote clients are really Citadel clients... but for a certain kind of
  // library. In this case, Calibre.
  const baseUrl = options.url;

  return {
    listBooks: () =>
      fetch(`${baseUrl}/books`)
        .then((res) => res.json() as unknown as { items: LibraryBook[] })
        .then((res) => res.items)
        .then((res) => {
          console.log(res);
          return res;
        }),
    sendToDevice: () => {
      throw new Error("Not implemented");
    },
    updateBook: () => {
      throw new Error("Not implemented");
    },
    getCoverPathForBook: () => {
      throw new Error("Not implemented");
    },
    getCoverUrlForBook() {
      throw new Error("Not implemented");
    },
    getDefaultFilePathForBook: () => {
      throw new Error("Not implemented");
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
  };
};

export const initCalibreClient = async (options: Options): Promise<Library> => {
  if (options.connectionType === "remote") {
    return genRemoteCalibreClient(options);
  } else {
    return genLocalCalibreClient(options);
  }
};
