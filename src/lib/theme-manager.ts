import { useEffect, useSyncExternalStore } from "react";
import type { ThemePalette } from "@/lib/platform/settings/types";

export type ColorScheme = "light" | "dark" | "auto";

/**
 * Selects which palette's stone block applies in styles.css. The "marble"
 * stones are the :root defaults, but the attribute is always set so the
 * active palette is inspectable.
 */
export const applyThemePalette = (palette: ThemePalette): void => {
	document.documentElement.setAttribute("data-palette", palette);
};

export const useApplyThemePalette = (palette: ThemePalette): void => {
	useEffect(() => {
		applyThemePalette(palette);
	}, [palette]);
};
export type ResolvedColorScheme = Exclude<ColorScheme, "auto">;

const DARK_QUERY = "(prefers-color-scheme: dark)";

/** Single shared MediaQueryList so subscribe/unsubscribe pairs always match. */
let systemDarkQuery: MediaQueryList | null = null;
const getSystemDarkQuery = (): MediaQueryList => {
	if (systemDarkQuery === null) {
		systemDarkQuery = window.matchMedia(DARK_QUERY);
	}
	return systemDarkQuery;
};

export const resolveColorScheme = (
	scheme: ColorScheme,
): ResolvedColorScheme => {
	if (scheme === "auto") {
		return getSystemDarkQuery().matches ? "dark" : "light";
	}
	return scheme;
};

const setRootAttributes = (resolved: ResolvedColorScheme) => {
	document.documentElement.setAttribute("data-theme", resolved);
};

/** Active OS-theme subscription while the applied scheme is "auto". */
let autoListener: ((event: MediaQueryListEvent) => void) | null = null;

const unsubscribeAuto = () => {
	if (autoListener !== null) {
		getSystemDarkQuery().removeEventListener("change", autoListener);
		autoListener = null;
	}
};

/**
 * Applies a color scheme to the document. "auto" resolves against the OS
 * preference and keeps following it live until a different scheme is applied
 * (any call replaces the previous matchMedia subscription).
 */
export const applyColorScheme = (scheme: ColorScheme): void => {
	unsubscribeAuto();
	if (scheme === "auto") {
		autoListener = (event) => {
			setRootAttributes(event.matches ? "dark" : "light");
		};
		getSystemDarkQuery().addEventListener("change", autoListener);
	}
	setRootAttributes(resolveColorScheme(scheme));
};

/**
 * React wrapper around {@link applyColorScheme}: re-applies whenever the
 * scheme changes and drops the OS subscription on unmount.
 */
export const useApplyColorScheme = (scheme: ColorScheme): void => {
	useEffect(() => {
		applyColorScheme(scheme);
		return unsubscribeAuto;
	}, [scheme]);
};

const subscribeSystemDark = (onChange: () => void) => {
	const query = getSystemDarkQuery();
	query.addEventListener("change", onChange);
	return () => {
		query.removeEventListener("change", onChange);
	};
};

const getSystemDarkSnapshot = () => getSystemDarkQuery().matches;

/**
 * The scheme actually in effect for the given setting: "auto" tracks the OS
 * preference live, "light"/"dark" pass through unchanged.
 */
export const useResolvedColorScheme = (
	scheme: ColorScheme,
): ResolvedColorScheme => {
	const systemDark = useSyncExternalStore(
		subscribeSystemDark,
		getSystemDarkSnapshot,
	);
	if (scheme === "auto") {
		return systemDark ? "dark" : "light";
	}
	return scheme;
};
