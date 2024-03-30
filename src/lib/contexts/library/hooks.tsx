import { useContext } from "react";
import { LibraryContext } from "./context";

export const useLibrary = () => {
	const context = useContext(LibraryContext);

	return {
    library: context.library,
    loading: context.loading,
    error: context.error
  }
};
