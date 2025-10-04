import { ThemeModalOpenContext } from "@/lib/contexts/modal-theme/context";
import { useContext } from "react";

export const useThemeModal = () => {
	return useContext(ThemeModalOpenContext);
};
