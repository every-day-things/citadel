import { addons } from "@storybook/preview-api";
import type { Preview } from "@storybook/react";
import React, { type PropsWithChildren, useEffect, useCallback } from "react";
import { DARK_MODE_EVENT_NAME } from "storybook-dark-mode";

import "../src/styles.css";

const STORYBOOK_IFRAME_PADDING_OFFSET = "36px";
const FULL_HEIGHT_MINUS_SB_PADDING = `calc(100svh - ${STORYBOOK_IFRAME_PADDING_OFFSET}`;

const channel = addons.getChannel();

function ColorSchemeWrapper({ children }: PropsWithChildren<unknown>) {
	const handleColorScheme = useCallback((value: boolean) => {
		// Same attribute the app's theme manager sets (see src/lib/theme-manager.ts)
		document.documentElement.setAttribute(
			"data-theme",
			value ? "dark" : "light",
		);
	}, []);

	useEffect(() => {
		channel.on(DARK_MODE_EVENT_NAME, handleColorScheme);
		return () => channel.off(DARK_MODE_EVENT_NAME, handleColorScheme);
	}, [handleColorScheme]);

	return <>{children}</>;
}

const preview: Preview = {
	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i,
			},
		},
	},
	decorators: [
		(Story) => (
			<ColorSchemeWrapper>
				<Story />
			</ColorSchemeWrapper>
		),
		(Story) => (
			<div
				style={{
					display: "grid",
					gridTemplateRows: "1fr",
					height: FULL_HEIGHT_MINUS_SB_PADDING,
					minHeight: FULL_HEIGHT_MINUS_SB_PADDING,
					padding: 16,
					overflowY: "scroll",
					background: "var(--ctd-content-bg)",
				}}
			>
				<Story />
			</div>
		),
	],
};

export default preview;
