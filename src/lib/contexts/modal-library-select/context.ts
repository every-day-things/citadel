import { createContext } from "react";

export const LibrarySelectModalContext = createContext(
	{} as {
		open: () => void;
		close: () => void;
		isOpen: boolean;
	},
);
