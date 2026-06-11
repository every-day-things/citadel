import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect } from "react";
import { useResolvedColorScheme } from "@/lib/theme-manager";
import { useSettings } from "@/stores/settings/store";

/**
 * Keeps the native window appearance (and with it the vibrancy material
 * behind the transparent webview) in step with the in-app theme choice, so
 * forcing dark Citadel on a light desktop doesn't produce light glass behind
 * dark text.
 */
export const useNativeThemeSync = () => {
	const theme = useSettings((state) => state.theme);
	const scheme = useResolvedColorScheme(theme);
	useEffect(() => {
		if (!isTauri()) return;
		// Forcing a window theme also forces the webview's prefers-color-scheme,
		// which is exactly what "auto" resolves from. setTheme(null) clears the
		// override so "auto" reads the real OS appearance again (matchMedia fires
		// a change event and the theme manager follows it).
		getCurrentWindow()
			.setTheme(theme === "auto" ? null : scheme === "dark" ? "dark" : "light")
			.catch(() => {
				// Pre-2.x runtimes without setTheme: vibrancy follows the system.
			});
	}, [theme, scheme]);
};
