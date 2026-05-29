import { safeAsyncEventHandler } from "$lib/async";
import { IS_DEV } from "@/lib/env";
import { checkForUpdates } from "@/lib/services/app-updates";
import { usePlatform } from "@/lib/platform/context";
import { theme } from "$lib/theme";
import { ColorSchemeScript, MantineProvider } from "@mantine/core";
import { notifications, Notifications } from "@mantine/notifications";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { FirstTimeSetup } from "./components/pages/firstTimeSetup";
import { routeTree } from "./routeTree.gen";
import { useActiveLibraryPath, useSettings } from "./stores/settings/store";
import { useInitializeLibraryStore } from "@/lib/hooks/use-initialize-library-store";

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
	const platform = usePlatform();

	useEffect(() => {
		if (hydrated) {
			safeAsyncEventHandler(() => platform.window.showMainWindow())();
		}
	}, [hydrated, platform]);

	useEffect(() => {
		if (!hydrated || !platform.capabilities.supportsAutoUpdates || IS_DEV)
			return;

		const {
			autoUpdateCheckingEnabled,
			hasCompletedFirstLaunch,
			setHasCompletedFirstLaunch,
			lastNotifiedUpdateVersion,
			setLastNotifiedUpdateVersion,
		} = useSettings.getState();

		if (!autoUpdateCheckingEnabled) return;
		if (!hasCompletedFirstLaunch) {
			safeAsyncEventHandler(async () => {
				await setHasCompletedFirstLaunch(true);
			})();
			return;
		}

		safeAsyncEventHandler(async () => {
			const updateCheckResult = await checkForUpdates();
			if (
				updateCheckResult.has_update &&
				updateCheckResult.version !== lastNotifiedUpdateVersion
			) {
				await setLastNotifiedUpdateVersion(updateCheckResult.version);
				notifications.show({
					id: "auto-update-available",
					title: "Update available",
					message: `Version ${updateCheckResult.version} is available. Open ⚙ to install.`,
					color: "blue",
					autoClose: 7000,
				});
			}
		})();
	}, [hydrated, platform]);

	if (!hydrated) {
		// No window is shown until settings are hydrated
		return null;
	}

	if (!libraryPath.isSome) {
		return (
			<MantineProvider theme={theme} defaultColorScheme="auto">
				<Notifications />
				<FirstTimeSetup />
			</MantineProvider>
		);
	}

	return (
		<>
			<ColorSchemeScript defaultColorScheme="auto" />
			<MantineProvider theme={theme} defaultColorScheme="auto">
				<Notifications />
				<LibraryStoreInitializer>
					<RouterProvider router={router} />
				</LibraryStoreInitializer>
			</MantineProvider>
		</>
	);
};

/**
 * Initializes the library store based on the active library path
 */
const LibraryStoreInitializer = ({
	children,
}: {
	children: React.ReactNode;
}) => {
	useInitializeLibraryStore();
	return <>{children}</>;
};
