import { LibraryBook } from "@/bindings";
import { isDefined } from "@/lib/isDefined";
import { Author } from "../entities/Author";
import {
	BookRepository,
	BookAuthorLinkRepository,
	AuthorRepository,
} from "../repositories/Repository";
import { BookId, AuthorId } from "../types";
import { libraryAuthor } from "../entities/LibraryAuthor";
import { libraryBook } from "../entities/LibraryBook";

export const createCatalogService = (
	bookRepository: BookRepository,
	bookAuthorLinkRepository: BookAuthorLinkRepository,
	authorRepository: AuthorRepository,
) => {
	const authorsForBook = async (bookId: BookId): Promise<AuthorId[]> => {
		return bookAuthorLinkRepository.getAuthorsForBook(bookId);
	};

	return {
		all: async (): Promise<LibraryBook[]> => {
			const books = await bookRepository.all();
			const authors = await authorRepository.all();
			const authorLookup = new Map<AuthorId, Author>(
				authors.map((author) => [author.id, author]),
			);

			const libraryBooks = books.map(async (book) => {
				const bookLibraryAuthors = (await authorsForBook(book.id))
					.map((id) => authorLookup.get(id))
					.filter(isDefined)
					.map(libraryAuthor.fromAuthor);

				return libraryBook.fromBookAndAuthorList(book, bookLibraryAuthors);
			});

			return Promise.all(libraryBooks);
		},
		authorsForBook,
	};
};
