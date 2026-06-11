import { useComputedColorScheme } from "@mantine/core";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect } from "react";

/**
 * Keeps the native window appearance (and with it the vibrancy material
 * behind the transparent webview) in step with the in-app theme choice, so
 * forcing dark Citadel on a light desktop doesn't produce light glass behind
 * dark text.
 */
export const useNativeThemeSync = () => {
	const scheme = useComputedColorScheme("light");
	useEffect(() => {
		if (!isTauri()) return;
		getCurrentWindow()
			.setTheme(scheme === "dark" ? "dark" : "light")
			.catch(() => {
				// Pre-2.x runtimes without setTheme: vibrancy follows the system.
			});
	}, [scheme]);
};
