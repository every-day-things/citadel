import { Button, createTheme } from "@mantine/core";
import classes from "./theme.module.css";

export const theme = createTheme({
	cursorType: "default",
	primaryColor: "sepia",
	fontFamily:
		'"Avenir Next", "Avenir", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
	headings: {
		fontFamily:
			'"Iowan Old Style", "Palatino Linotype", "Book Antiqua", "URW Palladio L", "Georgia", serif',
		fontWeight: "600",
	},
	defaultRadius: "sm",
	colors: {
		sepia: [
			"#fff5e8",
			"#f8e2c5",
			"#f0cc9e",
			"#e6b374",
			"#da994d",
			"#cf852f",
			"#b97327",
			"#9f611f",
			"#855016",
			"#6d410e",
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
