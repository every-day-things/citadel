import { create } from "zustand";
import { toast } from "@/components/ui";
import { IS_DEV } from "@/lib/env";
import {
	checkForUpdates,
	installUpdateIfAvailable,
} from "@/lib/services/app-updates";

interface AppUpdatesStore {
	isCheckingForUpdates: boolean;
	isUpdatePromptOpen: boolean;
	isInstallingUpdate: boolean;
	closeUpdatePrompt: () => void;
	checkForUpdatesNow: (supportsAutoUpdates: boolean) => Promise<void>;
	installAvailableUpdate: () => Promise<void>;
}

export const useAppUpdates = create<AppUpdatesStore>((set) => ({
	isCheckingForUpdates: false,
	isUpdatePromptOpen: false,
	isInstallingUpdate: false,

	closeUpdatePrompt: () => {
		set({ isUpdatePromptOpen: false });
	},

	checkForUpdatesNow: async (supportsAutoUpdates) => {
		if (!supportsAutoUpdates) return;

		set({ isCheckingForUpdates: true });
		toast.show({
			id: "check-for-updates",
			title: "Checking for updates",
			message: "Looking for a newer Citadel release.",
			loading: true,
		});

		try {
			const updateCheckResult = await checkForUpdates();
			if (updateCheckResult.has_update) {
				if (IS_DEV) {
					toast.update("check-for-updates", {
						title: "Update available (dev mode)",
						message: `Updates are not applied in dev. You would update to version ${
							updateCheckResult.version ?? "latest"
						}.`,
						loading: false,
						duration: 6500,
					});
					return;
				}

				toast.update("check-for-updates", {
					title: "Update available",
					message: "A new Citadel version is ready. Install now or later.",
					loading: false,
					duration: 4500,
				});
				set({ isUpdatePromptOpen: true });
			} else {
				toast.update("check-for-updates", {
					title: "You are up to date",
					message: "Citadel is already on the latest release.",
					loading: false,
					duration: 3500,
				});
			}
		} catch (error) {
			toast.update("check-for-updates", {
				title: "Update check failed",
				message: error instanceof Error ? error.message : String(error),
				loading: false,
				duration: 5000,
			});
		} finally {
			set({ isCheckingForUpdates: false });
		}
	},

	installAvailableUpdate: async () => {
		set({ isInstallingUpdate: true });
		toast.show({
			id: "install-update",
			title: "Installing update",
			message: "Downloading and applying the latest Citadel release.",
			loading: true,
		});

		try {
			const result = await installUpdateIfAvailable();
			if (result === "no-update") {
				toast.update("install-update", {
					title: "No update available",
					message: "This update is no longer available.",
					loading: false,
					duration: 4000,
				});
				set({ isUpdatePromptOpen: false });
			}
		} catch (error) {
			toast.update("install-update", {
				title: "Update install failed",
				message: error instanceof Error ? error.message : String(error),
				loading: false,
				duration: 5000,
			});
		} finally {
			set({ isInstallingUpdate: false });
		}
	},
}));
