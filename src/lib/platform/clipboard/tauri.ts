import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import type { ClipboardAdapter } from "../types";

export const createTauriClipboard = (): ClipboardAdapter => ({
	writeText: async (text) => {
		await writeText(text);
	},
});
