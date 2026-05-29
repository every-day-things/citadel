import type { WindowAdapter } from "../types";

export const createTauriWindow = (): WindowAdapter => ({
	showMainWindow: async () => {
		const { getCurrentWebviewWindow } = await import(
			"@tauri-apps/api/webviewWindow"
		);
		const appWindow = getCurrentWebviewWindow();
		await appWindow.show();
	},
});
