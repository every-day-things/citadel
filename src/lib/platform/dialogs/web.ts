import type { DialogAdapter } from "../types";

export const createWebDialogs = (): DialogAdapter => ({
	openFile: async () => null,
	openDirectory: async () => null,
});
