import { createContext } from "react";
import { Library } from "../../services/library";

export enum LibraryState {
	ready = 0,
	loading = 1,
	error = 2,
	closed = 3,
	starting = 4,
}

interface CtxClosed {
	library: null;
	loading: false;
	error: Error | null;
	state: LibraryState.closed;
}
interface CtxStarting {
	library: null;
	loading: false;
	error: null;
	state: LibraryState.starting;
}
interface CtxReady {
	library: Library;
	loading: false;
	error: null;
	state: LibraryState.ready;
}
interface CtxLoading {
	library: null;
	loading: true;
	error: null;
	state: LibraryState.loading;
}
interface CtxError {
	library: null;
	loading: false;
	error: Error;
	state: LibraryState.error;
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
};

export const LibraryContext = createContext<LibraryContextType>(
	DEFAULT_CONTEXT_VALUE,
);
