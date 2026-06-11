import { IS_DEV } from "@/lib/env";
import {
	checkForUpdates,
	installUpdateIfAvailable,
} from "@/lib/services/app-updates";
import { notifications } from "@mantine/notifications";
import { create } from "zustand";

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
		notifications.show({
			id: "check-for-updates",
			title: "Checking for updates",
			message: "Looking for a newer Citadel release.",
			loading: true,
			autoClose: false,
			withCloseButton: false,
		});

		try {
			const updateCheckResult = await checkForUpdates();
			if (updateCheckResult.has_update) {
				if (IS_DEV) {
					notifications.update({
						id: "check-for-updates",
						title: "Update available (dev mode)",
						message: `Updates are not applied in dev. You would update to version ${
							updateCheckResult.version ?? "latest"
						}.`,
						color: "blue",
						loading: false,
						autoClose: 6500,
						withCloseButton: true,
					});
					return;
				}

				notifications.update({
					id: "check-for-updates",
					title: "Update available",
					message: "A new Citadel version is ready. Install now or later.",
					color: "blue",
					loading: false,
					autoClose: 4500,
					withCloseButton: true,
				});
				set({ isUpdatePromptOpen: true });
			} else {
				notifications.update({
					id: "check-for-updates",
					title: "You are up to date",
					message: "Citadel is already on the latest release.",
					color: "green",
					loading: false,
					autoClose: 3500,
					withCloseButton: true,
				});
			}
		} catch (error) {
			notifications.update({
				id: "check-for-updates",
				title: "Update check failed",
				message: error instanceof Error ? error.message : String(error),
				color: "red",
				loading: false,
				autoClose: 5000,
				withCloseButton: true,
			});
		} finally {
			set({ isCheckingForUpdates: false });
		}
	},

	installAvailableUpdate: async () => {
		set({ isInstallingUpdate: true });
		notifications.show({
			id: "install-update",
			title: "Installing update",
			message: "Downloading and applying the latest Citadel release.",
			loading: true,
			autoClose: false,
			withCloseButton: false,
		});

		try {
			const result = await installUpdateIfAvailable();
			if (result === "no-update") {
				notifications.update({
					id: "install-update",
					title: "No update available",
					message: "This update is no longer available.",
					color: "yellow",
					loading: false,
					autoClose: 4000,
					withCloseButton: true,
				});
				set({ isUpdatePromptOpen: false });
			}
		} catch (error) {
			notifications.update({
				id: "install-update",
				title: "Update install failed",
				message: error instanceof Error ? error.message : String(error),
				color: "red",
				loading: false,
				autoClose: 5000,
				withCloseButton: true,
			});
		} finally {
			set({ isInstallingUpdate: false });
		}
	},
}));
