import {
	SettingsModalContext,
	type SettingsTab,
} from "@/lib/contexts/modal-settings/context";
import type { PropsWithChildren } from "react";
import { useCallback, useMemo, useState } from "react";

export const SettingsModalProvider = ({ children }: PropsWithChildren) => {
	const [isOpen, setIsOpen] = useState(false);
	const [activeTab, setActiveTab] = useState<SettingsTab>("general");

	const open = useCallback((tab?: SettingsTab) => {
		if (tab) {
			setActiveTab(tab);
		}
		setIsOpen(true);
	}, []);

	const close = useCallback(() => {
		setIsOpen(false);
	}, []);

	const value = useMemo(
		() => ({ isOpen, activeTab, open, close, setActiveTab }),
		[isOpen, activeTab, open, close],
	);

	return (
		<SettingsModalContext.Provider value={value}>
			{children}
		</SettingsModalContext.Provider>
	);
};
