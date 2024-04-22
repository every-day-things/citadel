import { useContext } from "react";
import { settingsContext } from "./context";

export const useSettings = () => {
	return useContext(settingsContext);
};
