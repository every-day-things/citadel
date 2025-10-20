import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./styles.css";
import "@mantine/core/styles.css";
import "@mantine/core/styles.layer.css";
import "mantine-datatable/styles.css";
import { useSettings } from "@/stores/settings/store";

// Auto-initialize the store when module loads
void useSettings.getState().init();

// biome-ignore lint/style/noNonNullAssertion: If this fails, we'll notice.
ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<Suspense>
			<App />
		</Suspense>
	</React.StrictMode>,
);
