import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./styles.css";
import "@mantine/core/styles.css";
import "@mantine/core/styles.layer.css";
import "@mantine/notifications/styles.css";
import "mantine-datatable/styles.css";
import { isTauri } from "@tauri-apps/api/core";
import { createTauriPlatform, createWebPlatform } from "@/lib/platform/create";
import { PlatformProvider } from "@/lib/platform/context";
import { useSettings } from "@/stores/settings/store";
import type { SettingsSchema } from "@/lib/platform/settings/types";

const defaultSettings: SettingsSchema = {
	theme: "auto",
	startFullscreen: false,
	autoUpdateCheckingEnabled: true,
	hasCompletedFirstLaunch: false,
	activeLibraryId: "",
	libraryPaths: [],
	hardcoverApiKey: "",
};

const platform = isTauri()
	? createTauriPlatform(defaultSettings)
	: createWebPlatform(defaultSettings);

void useSettings.getState().init(platform.settings);

// biome-ignore lint/style/noNonNullAssertion: If this fails, we'll notice.
ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<PlatformProvider value={platform}>
			<Suspense>
				<App />
			</Suspense>
		</PlatformProvider>
	</React.StrictMode>,
);
