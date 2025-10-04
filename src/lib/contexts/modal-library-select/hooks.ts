import { LibrarySelectModalContext } from "@/lib/contexts/modal-library-select/context";
import { useContext } from "react";

export const useLibrarySelectModal = () => {
	return useContext(LibrarySelectModalContext);
};
