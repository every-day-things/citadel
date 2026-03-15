import type { ClipboardAdapter } from "../types";

export const createWebClipboard = (): ClipboardAdapter => ({
	writeText: async (text) => {
		await navigator.clipboard.writeText(text);
	},
});
