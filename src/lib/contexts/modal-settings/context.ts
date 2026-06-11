import { createContext } from "react";

export const SETTINGS_TABS = ["general", "library", "integrations"] as const;
export type SettingsTab = (typeof SETTINGS_TABS)[number];

export interface SettingsModalContextValue {
	readonly isOpen: boolean;
	readonly activeTab: SettingsTab;
	readonly open: (tab?: SettingsTab) => void;
	readonly close: () => void;
	readonly setActiveTab: (tab: SettingsTab) => void;
}

export const SettingsModalContext = createContext<SettingsModalContextValue>({
	isOpen: false,
	activeTab: "general",
	open: () => undefined,
	close: () => undefined,
	setActiveTab: () => undefined,
});
