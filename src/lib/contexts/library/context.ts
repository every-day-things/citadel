import { createContext } from "react";
import { Library } from "../../services/library";

export enum LibraryState {
	ready = 0,
	loading = 1,
	error = 2,
	closed = 3,
	starting = 4,
}

export type LibraryContextType =
	| {
			library: null;
			loading: false;
			error: Error | null;
			state: LibraryState.closed;
	  }
	| {
			library: null;
			loading: false;
			error: null;
			state: LibraryState.starting;
	  }
	| {
			library: Library;
			loading: false;
			error: null;
			state: LibraryState.ready;
	  }
	| {
			library: null;
			loading: true;
			error: null;
			state: LibraryState.loading;
	  }
	| {
			library: null;
			loading: false;
			error: Error;
			state: LibraryState.error;
	  };

export const DEFAULT_CONTEXT_VALUE: LibraryContextType = {
	library: null,
	loading: false,
	error: null,
	state: LibraryState.starting,
};

export const LibraryContext = createContext<LibraryContextType>(
	DEFAULT_CONTEXT_VALUE,
);
