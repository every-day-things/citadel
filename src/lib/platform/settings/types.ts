export interface LibraryPath {
	id: string;
	displayName: string;
	absolutePath: string;
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export interface SettingsSchema {
	theme: "dark" | "light" | "auto";
	startFullscreen: boolean;
	autoUpdateCheckingEnabled: boolean;
	hasCompletedFirstLaunch: boolean;
	activeLibraryId: string;
	libraryPaths: LibraryPath[];
	hardcoverApiKey: string;
	lastNotifiedUpdateVersion: string | null;
}

export const defaultSettings: SettingsSchema = {
	theme: "auto",
	startFullscreen: false,
	autoUpdateCheckingEnabled: true,
	hasCompletedFirstLaunch: false,
	activeLibraryId: "",
	libraryPaths: [],
	hardcoverApiKey: "",
	lastNotifiedUpdateVersion: null,
};

export type SettingsKey = keyof SettingsSchema;
export type SettingsValue<K extends SettingsKey> = SettingsSchema[K];

export interface SettingsManager {
	initialize: () => Promise<SettingsSchema>;
	set: <K extends SettingsKey>(
		key: K,
		value: SettingsValue<K>,
	) => Promise<void>;
	get: <K extends SettingsKey>(key: K) => Promise<SettingsValue<K>>;
	/**
	 * Fires for every persisted change, including ones made from other windows
	 * sharing the same backing store. Returns an unsubscribe function.
	 */
	onChange?: (
		callback: (key: SettingsKey, value: SettingsSchema[SettingsKey]) => void,
	) => Promise<() => void>;
}
