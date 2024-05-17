import { safeAsyncEventHandler } from "$lib/async";
import { LocalCalibreLibraryProvider, WebCalibreLibraryProvider } from "$lib/contexts/library";
import { SettingsProvider } from "$lib/contexts/settings";
import { theme } from "$lib/theme";
import { ColorSchemeScript, MantineProvider } from "@mantine/core";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { FirstTimeSetup } from "./components/pages/firstTimeSetup";
import { routeTree } from "./routeTree.gen";
import { settings } from "./stores/settings";

const router = createRouter({
	routeTree,
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

export const App = () => {
	const [libraryPath, setLibraryPath] = useState<string | null>(null);
	const [libraryFSDirectoryHandle, setLibraryFSDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(
		null
	);
	const updateLibraryPath = useCallback(async () => {
		const libPath = await settings.get("calibreLibraryPath");
		setLibraryPath(libPath);
	}, []);
	useEffect(() => {
		settings.subscribe((settings) => {
			if (settings !== undefined && settings.calibreLibraryPath?.length > 0)
				setLibraryPath(settings.calibreLibraryPath);
		});
	}, []);

	if (libraryPath === null) {
		return (
			<MantineProvider theme={theme} defaultColorScheme="auto">
				<FirstTimeSetup
					onLibraryPathPicked={() => {
						safeAsyncEventHandler(updateLibraryPath)();
					}}
					onLibraryFSDirectoryHandlePicked={setLibraryFSDirectoryHandle}
				/>
			</MantineProvider>
		);
	}

	if (libraryFSDirectoryHandle) {
		return <SettingsProvider value={settings}>
			<WebCalibreLibraryProvider directoryHandle={libraryFSDirectoryHandle}>
				<ColorSchemeScript defaultColorScheme="auto" />
				<MantineProvider theme={theme} defaultColorScheme="auto">
					<RouterProvider router={router} />
				</MantineProvider>
			</WebCalibreLibraryProvider>
		</SettingsProvider>;
	}

	return (
		<SettingsProvider value={settings}>
			<LocalCalibreLibraryProvider libraryPath={libraryPath}>
				<ColorSchemeScript defaultColorScheme="auto" />
				<MantineProvider theme={theme} defaultColorScheme="auto">
					<RouterProvider router={router} />
				</MantineProvider>
			</LocalCalibreLibraryProvider>
		</SettingsProvider>
	);
};
