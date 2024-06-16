import { AppShell, MantineProvider } from "@mantine/core";
import type { Preview } from "@storybook/react";
import React from "react";
import { theme } from "../src/lib/theme";

import "../src/styles.css";
import "@mantine/core/styles.layer.css";
import "mantine-datatable/styles.css";

const STORYBOOK_IFRAME_PADDING_OFFSET = "36px";
const FULL_HEIGHT_MINUS_SB_PADDING = `calc(100svh - ${STORYBOOK_IFRAME_PADDING_OFFSET}`;

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
			<MantineProvider theme={theme} forceColorScheme="dark">
				<Story />
			</MantineProvider>
		),
	],
};

export default preview;
