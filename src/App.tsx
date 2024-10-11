import { safeAsyncEventHandler } from "$lib/async";
import { LibraryProvider } from "$lib/contexts/library";
import { SettingsProvider } from "$lib/contexts/settings";
import { theme } from "$lib/theme";
import { ColorSchemeScript, MantineProvider } from "@mantine/core";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { FirstTimeSetup } from "./components/pages/firstTimeSetup";
import { routeTree } from "./routeTree.gen";
import {
	getActiveLibrary,
	getActiveLibraryFromSchema,
	settings as settingsStore,
	waitForSettings,
} from "./stores/settings";

const router = createRouter({
	routeTree,
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

export const App = () => {
	const [isLoading, setIsLoading] = useState(true);
	const [libraryPath, setLibraryPath] = useState<string | null>(null);
	const updateLibraryPath = useCallback(async () => {
		const activeLibrary = await getActiveLibrary(settingsStore);
		if (activeLibrary.isSome) {
			setLibraryPath(activeLibrary.value.absolutePath);
		} else {
			setLibraryPath(null);
		}

		setIsLoading(false);
	}, []);
	useEffect(() => {
		const fetchSettings = async () => {
			await waitForSettings();

			settingsStore.subscribe((settings) => {
				if (settings !== undefined) {
					const activeLibrary = getActiveLibraryFromSchema(settings);
					if (activeLibrary.isSome) {
						setLibraryPath(activeLibrary.value.absolutePath);
					} else {
						setLibraryPath(null);
					}

					setIsLoading(false);
				}
			});
		};

		safeAsyncEventHandler(fetchSettings)();
	}, []);
	safeAsyncEventHandler(setupAppWindow)();

	useEffect(() => {
		if (!isLoading) {
			safeAsyncEventHandler(setupAppWindow)();
		}
	}, [isLoading]);

	if (isLoading) {
		return null;
	}

	if (libraryPath === null) {
		return (
			<MantineProvider theme={theme} defaultColorScheme="auto">
				<FirstTimeSetup
					onLibraryPathPicked={() => {
						safeAsyncEventHandler(updateLibraryPath)();
					}}
				/>
			</MantineProvider>
		);
	}

	return (
		<SettingsProvider value={settingsStore}>
			<LibraryProvider libraryPath={libraryPath}>
				<ColorSchemeScript defaultColorScheme="auto" />
				<MantineProvider theme={theme} defaultColorScheme="auto">
					<RouterProvider router={router} />
				</MantineProvider>
			</LibraryProvider>
		</SettingsProvider>
	);
};

/**
 * Set the main App Window to be visible.
 * Used to avoid a flash-of-white during startup. See:
 * https://github.com/tauri-apps/tauri/issues/5170, https://github.com/tauri-apps/tauri/issues/1564,
 * and https://github.com/cloudy-org/roseate/commit/21f445011f8becc81300b42fe10d8f4c419c95bd
 */
async function setupAppWindow() {
	const appWindow = (await import("@tauri-apps/api/window")).appWindow;
	safeAsyncEventHandler(async () => appWindow.show())();
}
