import { SettingsPanes } from "@/components/organisms/SettingsPanes";
import classes from "@/components/pages/SettingsWindow.module.css";
import { useNativeThemeSync } from "@/lib/hooks/use-native-theme-sync";
import { useSettings } from "@/stores/settings/store";
import { useMantineColorScheme } from "@mantine/core";
import { useRouter } from "@tanstack/react-router";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useCallback, useEffect } from "react";

/**
 * Full-window settings, opened as its own webview window (label `settings`)
 * by the macOS menu bar or the sidebar gear. Falls back to an in-window page
 * when not running under Tauri.
 */
export const SettingsWindow = () => {
	const { setColorScheme } = useMantineColorScheme();
	const theme = useSettings((state) => state.theme);
	const router = useRouter();
	useNativeThemeSync();

	// Keep Mantine's color scheme in sync with the persisted theme; this
	// window hydrates its own settings store (see src/main.tsx).
	useEffect(() => {
		setColorScheme(theme);
	}, [theme, setColorScheme]);

	// The window is created hidden (menu.rs); the main window's reveal path
	// (showMainWindow after library init) never runs on this route, so this
	// window must show itself once React has painted.
	useEffect(() => {
		if (isTauri()) {
			void getCurrentWindow().show();
		}
	}, []);

	const requestClose = useCallback(() => {
		if (isTauri()) {
			void getCurrentWindow().close();
		} else {
			router.history.back();
		}
	}, [router]);

	return (
		<div className={classes.window}>
			<SettingsPanes onRequestClose={requestClose} />
		</div>
	);
};
