export interface LibraryPath {
	id: string;
	displayName: string;
	absolutePath: string;
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type SettingsSchema = {
	theme: "dark" | "light" | "auto";
	startFullscreen: boolean;
	activeLibraryId: string;
	libraryPaths: LibraryPath[];
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
}
