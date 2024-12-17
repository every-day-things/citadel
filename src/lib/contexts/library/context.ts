import { createContext } from "react";
import { Library } from "../../services/library";
import { EventEmitter } from "@/lib/event";
import { LibraryAuthor, LibraryBook } from "@/bindings";

export enum LibraryState {
	ready = 0,
	loading = 1,
	error = 2,
	closed = 3,
	starting = 4,
}

export const LibraryEventNames = {
	LIBRARY_BOOK_CREATED: "018fdbce-b150-7987-9678-e9844fb6d8b3",
	LIBRARY_BOOK_UPDATED: "018fdbce-92b8-755e-a207-10f537d15c0c",
	LIBRARY_AUTHOR_CREATED: "0193d2c9-83ef-7aa9-a0da-0566b6959d89",
	LIBRARY_AUTHOR_UPDATED: "0193d2c9-9891-7dd1-9c96-6fc9abde43cb",
} as const;

// LibraryEvents must match a Record<string, {}>, which is why we use a type,
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type LibraryEvents = {
	[LibraryEventNames.LIBRARY_BOOK_CREATED]: { bookname: string };
	[LibraryEventNames.LIBRARY_BOOK_UPDATED]: { book: LibraryBook["id"] };
	[LibraryEventNames.LIBRARY_AUTHOR_CREATED]: { authorname: string };
	[LibraryEventNames.LIBRARY_AUTHOR_UPDATED]: { author: LibraryAuthor["id"] };
};

interface CtxClosed {
	library: null;
	loading: false;
	error: Error | null;
	state: LibraryState.closed;
	eventEmitter: null;
}
interface CtxStarting {
	library: null;
	loading: false;
	error: null;
	state: LibraryState.starting;
	eventEmitter: null;
}
interface CtxReady {
	library: Library;
	loading: false;
	error: null;
	state: LibraryState.ready;
	/**
	 * An event emitter with opaque event names. For possible events, see
	 * {@link LibraryEventNames}
	 */
	eventEmitter: EventEmitter<LibraryEvents>;
}
interface CtxLoading {
	library: null;
	loading: true;
	error: null;
	state: LibraryState.loading;
	eventEmitter: null;
}
interface CtxError {
	library: null;
	loading: false;
	error: Error;
	state: LibraryState.error;
	eventEmitter: null;
}
export type LibraryContextType =
	| CtxClosed
	| CtxStarting
	| CtxReady
	| CtxLoading
	| CtxError;

export const DEFAULT_CONTEXT_VALUE: LibraryContextType = {
	library: null,
	loading: false,
	error: null,
	state: LibraryState.starting,
	eventEmitter: null,
};

export const LibraryContext = createContext<LibraryContextType>(
	DEFAULT_CONTEXT_VALUE,
);
