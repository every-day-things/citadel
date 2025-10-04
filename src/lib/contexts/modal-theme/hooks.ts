import { ThemeModalContext } from "@/lib/contexts/modal-theme/context";
import { useContext } from "react";

export const useThemeModal = () => {
	return useContext(ThemeModalContext);
};
