import { getCurrentWindow } from "@tauri-apps/api/window";
import { commands } from "@/bindings";
import type { WindowAdapter } from "../types";

export const createTauriWindow = (): WindowAdapter => ({
	show: async () => {
		const window = getCurrentWindow();
		await window.show();
		await window.setFocus();
	},
	hide: () => getCurrentWindow().hide(),
	openSettings: () => commands.clbCmdOpenSettings(),
	setTheme: (theme) => getCurrentWindow().setTheme(theme),
	setBackgroundColor: (color) => getCurrentWindow().setBackgroundColor(color),
	hideOnClose: () =>
		getCurrentWindow().onCloseRequested((event) => {
			event.preventDefault();
			void getCurrentWindow().hide();
		}),
});
