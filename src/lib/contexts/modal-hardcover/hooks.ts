import { HardcoverModalContext } from "@/lib/contexts/modal-hardcover/context";
import { useContext } from "react";

export const useHardcoverModal = () => {
	return useContext(HardcoverModalContext);
};
