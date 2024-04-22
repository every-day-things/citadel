import { LibraryProvider } from "$lib/contexts/library";
import { SettingsProvider } from "$lib/contexts/settings";
import { theme } from "$lib/theme";
import { ColorSchemeScript, MantineProvider } from "@mantine/core";
import { useEffect, useState } from "react";
import { settings } from "./stores/settings";

import { routeTree } from "./routeTree.gen";
import { RouterProvider, createRouter } from "@tanstack/react-router";

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
	useEffect(() => {
		settings.subscribe((settings) => {
			if (settings !== undefined) setLibraryPath(settings.calibreLibraryPath);
		});
	}, []);

	if (libraryPath === null) {
		return null;
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
