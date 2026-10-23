import type { LibraryCatalog } from "./types";

const unavailable = async (): Promise<never> => {
	throw new Error("Local library management is unavailable in the browser");
};
export const webLibraryCatalog: LibraryCatalog = {
	open: unavailable,
	create: unavailable,
	isValid: async () => false,
	detect: async () => null,
	defaultNewPath: unavailable,
	stats: unavailable,
	syncStatus: async () => ({ synced: false, provider: null }),
};
