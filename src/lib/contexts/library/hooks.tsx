import { useContext } from "react";
import { LibraryContext, LibraryContextType } from "./context";

export const useLibrary = (): LibraryContextType => {
	const context = useContext(LibraryContext);

	return context;
};
