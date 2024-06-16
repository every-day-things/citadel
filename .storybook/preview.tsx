import { AppShell, MantineProvider } from "@mantine/core";
import type { Preview } from "@storybook/react";
import React from "react";
import { theme } from "../src/lib/theme";

import "../src/styles.css";
import "@mantine/core/styles.layer.css";
import "mantine-datatable/styles.css";

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
				h={"100vh"}
				style={{ overflowY: "scroll" }}
			>
				<AppShell.Main>
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
