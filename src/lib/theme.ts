import { Button, createTheme } from "@mantine/core";
import classes from "./theme.module.css";

export const theme = createTheme({
	cursorType: "default",
	components: {
		Button: Button.extend({
			classNames: classes,
		}),
	},
});
