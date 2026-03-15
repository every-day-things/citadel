import type { DialogAdapter } from "../types";

export const createWebDialogs = (): DialogAdapter => ({
	openFile: () => Promise.resolve(null),
	openDirectory: () => Promise.resolve(null),
});
