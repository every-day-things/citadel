import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./styles.css";
import { PlatformProvider } from "@/lib/platform/context";
import { createPlatform } from "@/lib/platform/create";
import { useSettings } from "@/stores/settings/store";

const platform = createPlatform();

// The macOS window paints an NSVisualEffectView behind a transparent webview;
// only there may the page background go transparent (elsewhere it would show
// through to nothing).
if (
	platform.capabilities.supportsNativeWindows &&
	navigator.userAgent.includes("Mac")
) {
	document.documentElement.dataset.vibrancy = "true";
}

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
