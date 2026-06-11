// Owned here (not in the library-view store) so the platform settings layer
// never depends on the stores layer; the store re-exports it.
export type LibraryBookSortOrderKey =
	| "nameAz"
	| "nameZa"
	| "authorAz"
	| "authorZa";

export interface LibraryPath {
	id: string;
	displayName: string;
	absolutePath: string;
}

export interface SmartShelfFilter {
	query: string;
	sortOrder: LibraryBookSortOrderKey;
	hideRead: boolean;
}

export interface SmartShelf {
	id: string;
	name: string;
	filter: SmartShelfFilter;
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
	hardcoverAutoLookup: boolean;
	lastNotifiedUpdateVersion: string | null;
	smartShelves: SmartShelf[];
}

export const defaultSettings: SettingsSchema = {
	theme: "auto",
	startFullscreen: false,
	autoUpdateCheckingEnabled: true,
	hasCompletedFirstLaunch: false,
	activeLibraryId: "",
	libraryPaths: [],
	hardcoverApiKey: "",
	hardcoverAutoLookup: false,
	lastNotifiedUpdateVersion: null,
	smartShelves: [
		{
			id: "builtin-unread",
			name: "Unread",
			filter: { query: "", sortOrder: "authorAz", hideRead: true },
		},
	],
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
