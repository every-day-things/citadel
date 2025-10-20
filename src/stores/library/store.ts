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

	// Mutations
	invalidateBooks: () => void;
	invalidateAuthors: () => void;

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

		invalidateBooks: () => {
			set({ booksLoading: true });
		},

		invalidateAuthors: () => {
			set({ authorsLoading: true });
		},

		reset: () => {
			set(initialState);
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
			const { library } = get();
			if (!library) throw new Error("Library not initialized");
			await library.updateBook(bookId, updates);
			await get().actions.loadBooks();
		},

		updateAuthor: async (
			authorId: string,
			updates: AuthorUpdate,
		): Promise<void> => {
			const { library } = get();
			if (!library) throw new Error("Library not initialized");
			await library.updateAuthor(authorId, updates);
			await get().actions.loadAuthors();
		},

		createAuthors: async (newAuthors: NewAuthor[]): Promise<void> => {
			const { library } = get();
			if (!library) throw new Error("Library not initialized");
			await library.createAuthors(newAuthors);
			await get().actions.loadAuthors();
		},

		deleteAuthor: async (authorId: string): Promise<void> => {
			const { library } = get();
			if (!library) throw new Error("Library not initialized");
			await library.deleteAuthor(authorId);
			await get().actions.loadAuthors();
		},

		deleteBookIdentifier: async (
			bookId: string,
			identifierId: number,
		): Promise<void> => {
			const { library } = get();
			if (!library) throw new Error("Library not initialized");
			await library.deleteBookIdentifier(bookId, identifierId);
			await get().actions.loadBooks();
		},

		upsertBookIdentifier: async (
			bookId: string,
			identifierId: number | null,
			label: string,
			value: string,
		): Promise<void> => {
			const { library } = get();
			if (!library) throw new Error("Library not initialized");
			await library.upsertBookIdentifier(bookId, identifierId, label, value);
			await get().actions.loadBooks();
		},

		addBook: async (
			metadata: ImportableBookMetadata,
		): Promise<string | undefined> => {
			const { library } = get();
			if (!library) throw new Error("Library not initialized");
			const bookId = await library.addImportableFileByMetadata(metadata);
			if (bookId) {
				await get().actions.loadBooks();
			}
			return bookId;
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
