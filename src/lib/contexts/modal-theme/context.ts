import { createContext } from "react";

export const ThemeModalContext = createContext(
	{} as readonly [
		boolean,
		{
			readonly open: () => void;
			readonly close: () => void;
			readonly toggle: () => void;
		},
	],
);
