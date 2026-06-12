import { useRouter } from "@tanstack/react-router";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useCallback, useEffect } from "react";
import { SettingsPanes } from "@/components/organisms/SettingsPanes";
import classes from "@/components/pages/SettingsWindow.module.css";
import { useNativeThemeSync } from "@/lib/hooks/use-native-theme-sync";
import {
	useApplyColorScheme,
	useResolvedColorScheme,
} from "@/lib/theme-manager";
import { useSettings } from "@/stores/settings/store";

/**
 * Resolves the current value of a --ctd-* color token to RGB by painting it
 * on a 1x1 canvas (computed styles may serialize as oklch(), which the
 * window API does not accept).
 */
const resolveTokenColor = (token: string): [number, number, number] | null => {
	const probe = document.createElement("div");
	probe.style.backgroundColor = `var(${token})`;
	document.body.appendChild(probe);
	const resolved = getComputedStyle(probe).backgroundColor;
	probe.remove();
	const canvas = document.createElement("canvas");
	canvas.width = 1;
	canvas.height = 1;
	const ctx = canvas.getContext("2d");
	if (!ctx) return null;
	ctx.fillStyle = resolved;
	ctx.fillRect(0, 0, 1, 1);
	const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
	if (r === undefined || g === undefined || b === undefined) return null;
	return [r, g, b];
};

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

	// macOS tints this window's real title bar from the window background
	// color, which menu.rs sets once at creation. Without this it stays the
	// creation-time color forever, e.g. a white bar on a dark window.
	const scheme = useResolvedColorScheme(theme);
	// biome-ignore lint/correctness/useExhaustiveDependencies: scheme is a re-run trigger; the value is read from the DOM after the attribute effect above applies.
	useEffect(() => {
		if (!isTauri()) return;
		const rgb = resolveTokenColor("--ctd-bg");
		if (!rgb) return;
		void getCurrentWindow().setBackgroundColor([...rgb, 255]);
	}, [scheme]);

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
