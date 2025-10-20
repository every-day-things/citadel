import { safeAsyncEventHandler } from "$lib/async";
import { LibraryProvider } from "$lib/contexts/library";
import { theme } from "$lib/theme";
import { ColorSchemeScript, MantineProvider } from "@mantine/core";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { FirstTimeSetup } from "./components/pages/firstTimeSetup";
import { routeTree } from "./routeTree.gen";
import { useActiveLibraryPath, useSettings } from "./stores/settings/store";

const router = createRouter({
	routeTree,
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

export const App = () => {
	const hydrated = useSettings((state) => state.hydrated);
	const libraryPath = useActiveLibraryPath();

	useEffect(() => {
		if (hydrated) {
			safeAsyncEventHandler(setupAppWindow)();
		}
	}, [hydrated]);

	if (!hydrated) {
		// No window is shown until settings are hydrated
		return null;
	}

	if (!libraryPath.isSome) {
		return (
			<MantineProvider theme={theme} defaultColorScheme="auto">
				<FirstTimeSetup />
			</MantineProvider>
		);
	}

	return (
		<LibraryProvider libraryPath={libraryPath.value}>
			<ColorSchemeScript defaultColorScheme="auto" />
			<MantineProvider theme={theme} defaultColorScheme="auto">
				<RouterProvider router={router} />
			</MantineProvider>
		</LibraryProvider>
	);
};

/**
 * Set the main App Window to be visible.
 * Used to avoid a flash-of-white during startup. See:
 * https://github.com/tauri-apps/tauri/issues/5170, https://github.com/tauri-apps/tauri/issues/1564,
 * and https://github.com/cloudy-org/roseate/commit/21f445011f8becc81300b42fe10d8f4c419c95bd
 */
async function setupAppWindow() {
	const { getCurrentWebviewWindow } = await import(
		"@tauri-apps/api/webviewWindow"
	);
	const appWindow = getCurrentWebviewWindow();
	safeAsyncEventHandler(async () => appWindow.show())();
}
