import { SettingsModalContext } from "@/lib/contexts/modal-settings/context";
import { useContext } from "react";

export const useSettingsModal = () => {
	return useContext(SettingsModalContext);
};
