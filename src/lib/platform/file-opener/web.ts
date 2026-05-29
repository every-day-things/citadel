import type { FileOpenerAdapter } from "../types";

export const createWebFileOpener = (): FileOpenerAdapter => ({
	openPath: (path) => {
		window.open(path, "_blank", "noopener,noreferrer");
		return Promise.resolve();
	},
	revealInFileManager: () => Promise.resolve(),
});
