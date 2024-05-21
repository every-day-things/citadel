import { SqlJsStatic } from "sql.js";

import { Book } from "../entities/Book";
import { AuthorId, BookId } from "../types";
import { Author } from "../entities/Author";

export interface BookAuthorLinkRepository {
  getAuthorsForBook: (bookId: BookId) => Promise<AuthorId[]>;
}

export interface AuthorRepository {
  all: () => Promise<Author[]>;
}

export interface BookRepository {
  all: () => Promise<Book[]>;
}

export type SqljsRepository<Repository> = (
	directoryHandle: FileSystemDirectoryHandle,
	sqlClient: SqlJsStatic,
) => Repository;
