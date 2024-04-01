import type { Preview } from "@storybook/react";

// import "../src/routes/styles.css"
// import "../src/routes/semantic.css"
import "../src/styles.css";
import "@mantine/core/styles.css";
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
};

export default preview;
