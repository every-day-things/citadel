import type { FileOpenerAdapter } from "../types";

export const createWebFileOpener = (): FileOpenerAdapter => ({
	openPath: (path) => {
		window.open(path);
		return Promise.resolve();
	},
	revealInFileManager: () => Promise.resolve(),
});
