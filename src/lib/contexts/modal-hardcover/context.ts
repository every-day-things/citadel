import { createContext } from "react";

export const HardcoverModalContext = createContext(
	{} as readonly [
		boolean,
		{
			readonly open: () => void;
			readonly close: () => void;
			readonly toggle: () => void;
		},
	],
);
