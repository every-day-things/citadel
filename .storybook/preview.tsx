import {
	AppShell,
	MantineProvider,
	useMantineColorScheme,
} from "@mantine/core";
import { addons } from "@storybook/preview-api";
import type { Preview } from "@storybook/react";
import React, { type PropsWithChildren, useEffect, useCallback } from "react";
import { DARK_MODE_EVENT_NAME } from "storybook-dark-mode";
import { theme } from "../src/lib/theme";

import "../src/styles.css";
import "@mantine/core/styles.layer.css";
import "mantine-datatable/styles.css";

const STORYBOOK_IFRAME_PADDING_OFFSET = "36px";
const FULL_HEIGHT_MINUS_SB_PADDING = `calc(100svh - ${STORYBOOK_IFRAME_PADDING_OFFSET}`;

const channel = addons.getChannel();

function ColorSchemeWrapper({ children }: PropsWithChildren<unknown>) {
	const { setColorScheme } = useMantineColorScheme();
	const handleColorScheme = useCallback(
		(value: boolean) => setColorScheme(value ? "dark" : "light"),
		[setColorScheme],
	);

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
			<AppShell
				header={{ height: 0 }}
				footer={{ height: 0 }}
				padding="md"
				h={FULL_HEIGHT_MINUS_SB_PADDING}
				style={{ overflowY: "scroll" }}
			>
				<AppShell.Main
					style={{
						display: "grid",
						gridTemplateRows: "1fr",
						height: FULL_HEIGHT_MINUS_SB_PADDING,
						minHeight: FULL_HEIGHT_MINUS_SB_PADDING,
					}}
				>
					<Story />
				</AppShell.Main>
			</AppShell>
		),
		(Story) => (
			<MantineProvider theme={theme}>
				<Story />
			</MantineProvider>
		),
	],
};

export default preview;
