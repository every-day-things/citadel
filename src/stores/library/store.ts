import { create } from "zustand";
import { open as dialogOpen } from "@tauri-apps/plugin-dialog";

import type {
	AuthorUpdate,
	BookUpdate,
	ImportableBookMetadata,
	LibraryAuthor,
	LibraryBook,
	NewAuthor,
} from "@/bindings";
import { commands } from "@/bindings";
import type { Library, Options } from "@/lib/services/library";
import { initClient } from "@/lib/services/library";
import { sortAuthors } from "@/lib/domain/author";

export enum LibraryState {
	uninitialized = "uninitialized",
	initializing = "initializing",
	ready = "ready",
	error = "error",
}

interface LibraryActions {
	// Core actions
	loadBooks: () => Promise<void>;
	loadAuthors: () => Promise<void>;
	initialize: (libraryPath: string) => Promise<void>;
	reset: () => void;

	// Library management
	createLibrary: (libraryRoot: string) => Promise<void>;
	promptToAddBook: () => Promise<ImportableBookMetadata | undefined>;
	commitAddBook: (
		metadata: ImportableBookMetadata,
	) => Promise<string | undefined>;

	// Book and author mutations
	updateBook: (bookId: string, updates: BookUpdate) => Promise<void>;
	updateAuthor: (authorId: string, updates: AuthorUpdate) => Promise<void>;
	createAuthors: (newAuthors: NewAuthor[]) => Promise<void>;
	deleteAuthor: (authorId: string) => Promise<void>;
	deleteBookIdentifier: (bookId: string, identifierId: number) => Promise<void>;
	upsertBookIdentifier: (
		bookId: string,
		identifierId: number | null,
		label: string,
		value: string,
	) => Promise<void>;
	addBook: (metadata: ImportableBookMetadata) => Promise<string | undefined>;
}

interface LibraryStoreState {
	// Library instance
	library: Library | null;
	libraryState: LibraryState;
	libraryError: Error | null;

	// Books state
	books: LibraryBook[];
	booksLoading: boolean;
	booksError: string | null;

	// Authors state
	authors: LibraryAuthor[];
	authorsLoading: boolean;
	authorsError: string | null;

	// Stable actions object containing ALL actions
	actions: LibraryActions;
}

const initialState = {
	library: null,
	libraryState: LibraryState.uninitialized,
	libraryError: null,
	books: [],
	booksLoading: false,
	booksError: null,
	authors: [],
	authorsLoading: false,
	authorsError: null,
};

const localLibraryFromPath = (path: string): Options => ({
	libraryPath: path,
	libraryType: "calibre",
	connectionType: "local",
});

export const useLibraryStore = create<LibraryStoreState>((set, get) => ({
	...initialState,

	// Stable actions object - ALL actions go here, created once and never change
	actions: {
		loadBooks: async () => {
			const { library } = get();
			if (!library) return;

			set({ booksLoading: true, booksError: null });
			try {
				const books = await library.listBooks();
				set({ books, booksLoading: false });
			} catch (error) {
				set({
					booksError:
						error instanceof Error ? error.message : "Failed to load books",
					booksLoading: false,
				});
			}
		},

		loadAuthors: async () => {
			const { library } = get();
			if (!library) return;

			set({ authorsLoading: true, authorsError: null });
			try {
				const authors = await library.listAuthors();
				set({ authors: authors.sort(sortAuthors), authorsLoading: false });
			} catch (error) {
				set({
					authorsError:
						error instanceof Error ? error.message : "Failed to load authors",
					authorsLoading: false,
				});
			}
		},

		initialize: async (libraryPath: string) => {
			const actions = get().actions;

			set({ libraryState: LibraryState.initializing, libraryError: null });

			try {
				const library = await initClient(localLibraryFromPath(libraryPath));
				set({ library });

				await Promise.all([actions.loadBooks(), actions.loadAuthors()]);

				set({ libraryState: LibraryState.ready });
			} catch (error) {
				console.error("Failed to initialize library:", error);
				set({
					libraryState: LibraryState.error,
					libraryError:
						error instanceof Error ? error : new Error(String(error)),
				});
			}
		},

		reset: () => {
			set({ ...initialState, actions: get().actions });
		},

		createLibrary: async (libraryRoot: string) => {
			const create = await commands.clbCmdCreateLibrary(libraryRoot);
			if (create.status === "error") {
				console.error("Failed to create library", create.error);
				return;
			}
		},

		promptToAddBook: async () => {
			const { library } = get();
			if (!library) return;

			const validExtensions = (await library.listValidFileTypes()).map(
				(type) => type.extension,
			);
			const filePath = await dialogOpen({
				multiple: false,
				directory: false,
				filters: [
					{
						name: "Importable files",
						extensions: validExtensions,
					},
				],
			});

			if (!filePath) {
				return;
			}

			if (Array.isArray(filePath)) {
				throw new Error("Multiple file selection not supported");
			}

			const importableFile = await library.checkFileImportable(filePath);
			if (!importableFile) {
				console.error(`File ${filePath} not importable`);
				return;
			}
			const metadata = await library.getImportableFileMetadata(importableFile);
			if (!metadata) {
				console.error(`Failed to get metadata for file at ${filePath}`);
				return;
			}

			return metadata;
		},

		commitAddBook: async (metadata: ImportableBookMetadata) => {
			const { library } = get();
			if (!library) return;

			const bookId = await library.addImportableFileByMetadata(metadata);
			return bookId;
		},
		updateBook: async (bookId: string, updates: BookUpdate): Promise<void> => {
			const { library, books, authors } = get();
			if (!library) throw new Error("Library not initialized");

			// Find the book to update
			const bookIndex = books.findIndex((b) => b.id === bookId);
			if (bookIndex === -1) {
				throw new Error(`Book with id ${bookId} not found`);
			}

			const currentBook = books[bookIndex];

			// Build optimistic update
			const optimisticBook: LibraryBook = { ...currentBook };

			if (updates.title !== null) {
				optimisticBook.title = updates.title;
			}
			if (updates.is_read !== null) {
				optimisticBook.is_read = updates.is_read;
			}
			if (updates.description !== null) {
				optimisticBook.description = updates.description;
			}
			if (updates.author_id_list !== null) {
				// Map author IDs to author objects
				const updatedAuthors = updates.author_id_list
					.map((authorId) => authors.find((a) => a.id === authorId))
					.filter((author): author is LibraryAuthor => author !== undefined);
				optimisticBook.author_list = updatedAuthors;
			}

			// Apply optimistic update immediately
			const optimisticBooks = [...books];
			optimisticBooks[bookIndex] = optimisticBook;
			set({ books: optimisticBooks });

			try {
				// Send update to backend - trust optimistic update, no refetch needed
				await library.updateBook(bookId, updates);
				// Optimistic update is now confirmed, no additional data fetch required
			} catch (error) {
				// On error, revert by reloading all books
				await get().actions.loadBooks();
				throw error;
			}
		},

		updateAuthor: async (
			authorId: string,
			updates: AuthorUpdate,
		): Promise<void> => {
			const { library, authors } = get();
			if (!library) throw new Error("Library not initialized");

			// Optimistically update author in store
			const authorIndex = authors.findIndex((a) => a.id === authorId);
			if (authorIndex !== -1) {
				const updatedAuthors = [...authors];
				updatedAuthors[authorIndex] = {
					...updatedAuthors[authorIndex],
					...(updates.full_name && { name: updates.full_name }),
					...(updates.sortable_name && { sortable_name: updates.sortable_name }),
				};
				set({ authors: updatedAuthors });
			}

			try {
				await library.updateAuthor(authorId, updates);
				// Trust optimistic update - no refetch
			} catch (error) {
				// On error, reload authors
				await get().actions.loadAuthors();
				throw error;
			}
		},

		createAuthors: async (newAuthors: NewAuthor[]): Promise<void> => {
			const { library } = get();
			if (!library) throw new Error("Library not initialized");

			try {
				const createdAuthors = await library.createAuthors(newAuthors);
				// Add newly created authors to store
				set((state) => ({
					authors: [...state.authors, ...createdAuthors].sort(sortAuthors),
				}));
			} catch (error) {
				// On error, reload authors
				await get().actions.loadAuthors();
				throw error;
			}
		},

		deleteAuthor: async (authorId: string): Promise<void> => {
			const { library, authors } = get();
			if (!library) throw new Error("Library not initialized");

			// Optimistically remove author from store
			const filteredAuthors = authors.filter((a) => a.id !== authorId);
			set({ authors: filteredAuthors });

			try {
				await library.deleteAuthor(authorId);
				// Trust optimistic update - no refetch
			} catch (error) {
				// On error, reload authors
				await get().actions.loadAuthors();
				throw error;
			}
		},

		deleteBookIdentifier: async (
			bookId: string,
			identifierId: number,
		): Promise<void> => {
			const { library, books } = get();
			if (!library) throw new Error("Library not initialized");

			// Find the book to update
			const bookIndex = books.findIndex((b) => b.id === bookId);
			if (bookIndex !== -1) {
				// Apply optimistic update - remove identifier from list
				const currentBook = books[bookIndex];
				const optimisticBook: LibraryBook = {
					...currentBook,
					identifier_list: currentBook.identifier_list.filter(
						(id) => id.id !== identifierId,
					),
				};

				const optimisticBooks = [...books];
				optimisticBooks[bookIndex] = optimisticBook;
				set({ books: optimisticBooks });
			}

			try {
				// Send delete to backend - trust optimistic update, no refetch needed
				await library.deleteBookIdentifier(bookId, identifierId);
			} catch (error) {
				// On error, revert by reloading all books
				await get().actions.loadBooks();
				throw error;
			}
		},

		upsertBookIdentifier: async (
			bookId: string,
			identifierId: number | null,
			label: string,
			value: string,
		): Promise<void> => {
			const { library, books } = get();
			if (!library) throw new Error("Library not initialized");

			// Store original book state for potential rollback
			const bookIndex = books.findIndex((b) => b.id === bookId);
			const originalBook = bookIndex !== -1 ? books[bookIndex] : null;

			if (bookIndex !== -1) {
				// Apply optimistic update - add or update identifier
				const currentBook = books[bookIndex];
				let optimisticIdentifiers = [...currentBook.identifier_list];

				if (identifierId !== null) {
					// Update existing identifier
					const idIndex = optimisticIdentifiers.findIndex(
						(id) => id.id === identifierId,
					);
					if (idIndex !== -1) {
						optimisticIdentifiers[idIndex] = { id: identifierId, label, value };
					}
				} else {
					// Add new identifier (use a temporary negative ID)
					optimisticIdentifiers.push({ id: -1, label, value });
				}

				const optimisticBook: LibraryBook = {
					...currentBook,
					identifier_list: optimisticIdentifiers,
				};

				const optimisticBooks = [...books];
				optimisticBooks[bookIndex] = optimisticBook;
				set({ books: optimisticBooks });
			}

			try {
				// Send upsert to backend - now returns the created/updated identifier
				const returnedIdentifier = await library.upsertBookIdentifier(
					bookId,
					identifierId,
					label,
					value,
				);

				// Update the book with the real identifier (replaces temporary ID if it was a create)
				if (bookIndex !== -1) {
					set((state) => {
						const currentBooks = state.books;
						const index = currentBooks.findIndex((b) => b.id === bookId);
						if (index === -1) return state;

						const currentBook = currentBooks[index];
						let updatedIdentifiers = [...currentBook.identifier_list];

						if (identifierId !== null) {
							// Update existing - replace in list
							const idIndex = updatedIdentifiers.findIndex(
								(id) => id.id === identifierId,
							);
							if (idIndex !== -1) {
								updatedIdentifiers[idIndex] = returnedIdentifier;
							}
						} else {
							// Create new - replace the temporary -1 ID with real one
							const tempIndex = updatedIdentifiers.findIndex((id) => id.id === -1);
							if (tempIndex !== -1) {
								updatedIdentifiers[tempIndex] = returnedIdentifier;
							}
						}

						const newBooks = [...currentBooks];
						newBooks[index] = {
							...currentBook,
							identifier_list: updatedIdentifiers,
						};
						return { books: newBooks };
					});
				}
			} catch (error) {
				// On error, revert by reloading all books
				await get().actions.loadBooks();
				throw error;
			}
		},

		addBook: async (
			metadata: ImportableBookMetadata,
		): Promise<string | undefined> => {
			const { library } = get();
			if (!library) throw new Error("Library not initialized");

			try {
				// Backend now returns the full LibraryBook
				const createdBook = await library.addImportableFileByMetadata(metadata);
				if (createdBook) {
					// Add the new book to the store optimistically
					set((state) => ({
						books: [...state.books, createdBook],
					}));
					return createdBook.id;
				}
				return undefined;
			} catch (error) {
				// On error, revert by reloading all books
				await get().actions.loadBooks();
				throw error;
			}
		},
	},
}));

// Selectors for library state
export const useLibraryState = () =>
	useLibraryStore((state) => state.libraryState);
export const useLibraryReady = () =>
	useLibraryStore((state) => state.libraryState === LibraryState.ready);
export const useLibraryInitializing = () =>
	useLibraryStore((state) => state.libraryState === LibraryState.initializing);
export const useLibraryError = () =>
	useLibraryStore((state) => state.libraryError);

// Selectors for books
export const useBooks = () => useLibraryStore((state) => state.books);
export const useBooksLoading = () =>
	useLibraryStore((state) => state.booksLoading);
export const useBooksError = () => useLibraryStore((state) => state.booksError);

// Selectors for authors
export const useAuthors = () => useLibraryStore((state) => state.authors);
export const useAuthorsLoading = () =>
	useLibraryStore((state) => state.authorsLoading);
export const useAuthorsError = () =>
	useLibraryStore((state) => state.authorsError);

// Selector for stable actions object
export const useLibraryActions = () =>
	useLibraryStore((state) => state.actions);
