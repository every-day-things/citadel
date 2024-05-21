import { SqlJsStatic } from "sql.js";

import { BookAuthorLinkRepository, SqljsRepository } from "./Repository";
import { AuthorId } from "../types";
import { Author } from "../entities/Author";
import { Book } from "../entities/Book";
import { loadDb } from "../db";

export const createBookAuthorLinkRepository: SqljsRepository<
	BookAuthorLinkRepository
> = (directoryHandle, sqlClient) => {
	return {
		getAuthorsForBook: async (bookId) => {
			const db = await loadDb(directoryHandle, sqlClient);
			if (!db) throw new Error("No database");

			const res = db.exec(
				`SELECT author FROM 'books_authors_link' WHERE book = ${bookId}`,
			);
			return res[0].values.map((row) => (row[0] ?? "").toString() as AuthorId);
		},
	};
};

export const createAuthorRepository = (
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

export const createBookRepository = (
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
