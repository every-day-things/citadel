import { commands } from "@/bindings";
import { createTauriLibrary } from "../library/tauri";
import type { LibraryCatalog } from "./types";

const unwrap = <T>(
	result: { status: "ok"; data: T } | { status: "error"; error: string },
): T => {
	if (result.status === "error") throw new Error(result.error);
	return result.data;
};

export const tauriLibraryCatalog: LibraryCatalog = {
	open: async (options) => {
		if (options.libraryType !== "calibre")
			throw new Error(`Unknown library type: ${options.libraryType}`);
		if (options.connectionType !== "local")
			throw new Error("Remote library connections are not available yet");
		unwrap(await commands.initClient(options.libraryPath));
		return createTauriLibrary();
	},
	create: async (path) => {
		unwrap(await commands.clbCmdCreateLibrary(path));
	},
	isValid: (path) => commands.clbQueryIsPathValidLibrary(path),
	detect: () => commands.clbQueryDetectCalibreLibrary(),
	defaultNewPath: async () =>
		unwrap(await commands.clbQueryDefaultNewLibraryPath()),
	stats: async (path) => unwrap(await commands.clbQueryLibraryStats(path)),
	syncStatus: (path) => commands.clbQueryPathSyncStatus(path),
};
