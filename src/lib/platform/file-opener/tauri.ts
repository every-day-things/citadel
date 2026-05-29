import { openPath, revealItemInDir } from "@tauri-apps/plugin-opener";
import type { FileOpenerAdapter } from "../types";

export const createTauriFileOpener = (): FileOpenerAdapter => ({
	openPath: async (path) => {
		await openPath(path);
	},
	revealInFileManager: async (path) => {
		await revealItemInDir(path);
	},
});
