import type { AuthorUpdate, BookUpdate, ImportableBookMetadata, NewAuthor } from "@/bindings";
import { useLibraryStore } from "./store";

/**
 * Actions that perform mutations and automatically update the store.
 * These replace the pattern of calling library methods + manually emitting events.
 */

export const createLibraryActions = () => {
	const getLibrary = () => {
		const library = useLibraryStore.getState().library;
		if (!library) {
			throw new Error("Library not initialized");
		}
		return library;
	};

	return {
		/**
		 * Update a book and refresh the books cache
		 */
		updateBook: async (bookId: string, updates: BookUpdate): Promise<void> => {
			const library = getLibrary();
			await library.updateBook(bookId, updates);
			await useLibraryStore.getState().loadBooks();
		},

		/**
		 * Update an author and refresh the authors cache
		 */
		updateAuthor: async (authorId: string, updates: AuthorUpdate): Promise<void> => {
			const library = getLibrary();
			await library.updateAuthor(authorId, updates);
			await useLibraryStore.getState().loadAuthors();
		},

		/**
		 * Create authors and refresh the authors cache
		 */
		createAuthors: async (newAuthors: NewAuthor[]): Promise<void> => {
			const library = getLibrary();
			await library.createAuthors(newAuthors);
			await useLibraryStore.getState().loadAuthors();
		},

		/**
		 * Delete an author and refresh the authors cache
		 */
		deleteAuthor: async (authorId: string): Promise<void> => {
			const library = getLibrary();
			await library.deleteAuthor(authorId);
			await useLibraryStore.getState().loadAuthors();
		},

		/**
		 * Delete a book identifier and refresh the books cache
		 */
		deleteBookIdentifier: async (bookId: string, identifierId: number): Promise<void> => {
			const library = getLibrary();
			await library.deleteBookIdentifier(bookId, identifierId);
			await useLibraryStore.getState().loadBooks();
		},

		/**
		 * Upsert a book identifier and refresh the books cache
		 */
		upsertBookIdentifier: async (
			bookId: string,
			identifierId: number | null,
			label: string,
			value: string,
		): Promise<void> => {
			const library = getLibrary();
			await library.upsertBookIdentifier(bookId, identifierId, label, value);
			await useLibraryStore.getState().loadBooks();
		},

		/**
		 * Add a book from metadata and refresh the books cache
		 */
		addBook: async (metadata: ImportableBookMetadata): Promise<string | undefined> => {
			const library = getLibrary();
			const bookId = await library.addImportableFileByMetadata(metadata);
			if (bookId) {
				await useLibraryStore.getState().loadBooks();
			}
			return bookId;
		},
	};
};

/**
 * Hook to get library mutation actions
 */
export const useLibraryActions = () => {
	return createLibraryActions();
};
