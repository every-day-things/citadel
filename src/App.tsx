import { LibraryProvider } from "$lib/contexts/library";
import { SettingsProvider } from "$lib/contexts/settings";
import { theme } from "$lib/theme";
import { ColorSchemeScript, MantineProvider } from "@mantine/core";
import { useCallback, useEffect, useState } from "react";
import { settings } from "./stores/settings";

import { routeTree } from "./routeTree.gen";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { FirstTimeSetup } from "./components/pages/firstTimeSetup";

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
				<FirstTimeSetup onLibraryPathPicked={updateLibraryPath} />
			</MantineProvider>
		);
	}

	return (
		<SettingsProvider value={settings}>
			<LibraryProvider libraryPath={libraryPath}>
				<ColorSchemeScript defaultColorScheme="auto" />
				<MantineProvider theme={theme} defaultColorScheme="auto">
					<RouterProvider router={router} />
				</MantineProvider>
			</LibraryProvider>
		</SettingsProvider>
	);
};
