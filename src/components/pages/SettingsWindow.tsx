import { useRouter } from "@tanstack/react-router";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useCallback, useEffect } from "react";
import { SettingsPanes } from "@/components/organisms/SettingsPanes";
import classes from "@/components/pages/SettingsWindow.module.css";
import { useNativeThemeSync } from "@/lib/hooks/use-native-theme-sync";
import { useApplyColorScheme } from "@/lib/theme-manager";
import { useSettings } from "@/stores/settings/store";

/**
 * Full-window settings, opened as its own webview window (label `settings`)
 * by the macOS menu bar or the sidebar gear. Falls back to an in-window page
 * when not running under Tauri.
 */
export const SettingsWindow = () => {
	const theme = useSettings((state) => state.theme);
	const router = useRouter();
	useNativeThemeSync();

	// Keep the document color scheme in sync with the persisted theme; this
	// window hydrates its own settings store (see src/main.tsx).
	useApplyColorScheme(theme);

	// The window is created hidden (menu.rs); the main window's reveal path
	// (showMainWindow after library init) never runs on this route, so this
	// window must show itself. Two rAF ticks push the reveal past the first
	// real paint so no white or unstyled frame is ever visible.
	useEffect(() => {
		if (!isTauri()) return;
		let cancelled = false;
		const outer = requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				if (cancelled) return;
				const window = getCurrentWindow();
				void window.show().then(() => window.setFocus());
			});
		});
		return () => {
			cancelled = true;
			cancelAnimationFrame(outer);
		};
	}, []);

	// Hide on close instead of destroying the webview, so reopening from the
	// menu is instant (menu.rs shows + focuses the existing window).
	useEffect(() => {
		if (!isTauri()) return;
		const unlisten = getCurrentWindow().onCloseRequested((event) => {
			event.preventDefault();
			void getCurrentWindow().hide();
		});
		return () => {
			void unlisten.then((fn) => fn());
		};
	}, []);

	const requestClose = useCallback(() => {
		if (isTauri()) {
			void getCurrentWindow().hide();
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
