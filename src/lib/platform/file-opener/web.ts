import type { FileOpenerAdapter } from "../types";

export const createWebFileOpener = (): FileOpenerAdapter => ({
	openPath: async (path) => {
		window.open(path);
	},
	revealInFileManager: async () => {
		// no-op: no file manager in web
	},
});
