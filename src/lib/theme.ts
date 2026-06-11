import { Button, createTheme } from "@mantine/core";
import classes from "./theme.module.css";

export const theme = createTheme({
	cursorType: "default",
	primaryColor: "accent",
	fontFamily:
		'-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
	headings: {
		fontFamily:
			'-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
		fontWeight: "600",
	},
	defaultRadius: "md",
	colors: {
		accent: [
			"#e8f2ff",
			"#cfe4ff",
			"#a3cbff",
			"#74b0ff",
			"#4d99ff",
			"#2f88ff",
			"#1a7fff",
			"#0a6ce6",
			"#005fce",
			"#0052b5",
		],
	},
	shadows: {
		md: "var(--ctd-shadow-soft)",
		lg: "var(--ctd-shadow-lift)",
	},
	components: {
		Button: Button.extend({
			classNames: classes,
		}),
	},
});
