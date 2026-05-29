import type { WindowAdapter } from "../types";

export const createWebWindow = (): WindowAdapter => ({
	showMainWindow: async () => {
		// no-op: window is always visible in web
	},
});
