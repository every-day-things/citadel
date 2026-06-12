import { createRouter, RouterProvider } from "@tanstack/react-router";
import { useEffect } from "react";
import { Toaster, TooltipProvider, toast } from "@/components/ui";
import { IS_DEV } from "@/lib/env";
import { useInitializeLibraryStore } from "@/lib/hooks/use-initialize-library-store";
import { usePlatform } from "@/lib/platform/context";
import { checkForUpdates } from "@/lib/services/app-updates";
import { useApplyColorScheme } from "@/lib/theme-manager";
import { safeAsyncEventHandler } from "$lib/async";
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
	const theme = useSettings((state) => state.theme);
	const libraryPath = useActiveLibraryPath();
	const platform = usePlatform();
	useApplyColorScheme(theme);

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
				toast.show({
					id: "auto-update-available",
					title: "Update available",
					message: `Version ${updateCheckResult.version} is available. Open ⚙ to install.`,
					duration: 7000,
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
			<TooltipProvider>
				<Toaster />
				<FirstTimeSetup />
			</TooltipProvider>
		);
	}

	return (
		<TooltipProvider>
			<Toaster />
			<LibraryStoreInitializer>
				<RouterProvider router={router} />
			</LibraryStoreInitializer>
		</TooltipProvider>
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
