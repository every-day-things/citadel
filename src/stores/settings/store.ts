import { create } from "zustand";
import type { Option } from "@/lib/option";
import { none, some } from "@/lib/option";
import {
	defaultSettings,
	type LibraryPath,
	type SettingsKey,
	type SettingsManager,
	type SettingsSchema,
	type SettingsValue,
	THEME_PALETTES,
	type ThemePalette,
} from "@/lib/platform/settings/types";

interface SettingsStore extends SettingsSchema {
	hydrated: boolean;
	settingsManager: SettingsManager | null;

	// Lifecycle
	init: (settingsManager: SettingsManager) => Promise<void>;

	// Domain-specific actions
	setTheme: (theme: "dark" | "light" | "auto") => Promise<void>;
	setThemePalette: (palette: ThemePalette) => Promise<void>;
	setStartFullscreen: (enabled: boolean) => Promise<void>;
	setAutoUpdateCheckingEnabled: (enabled: boolean) => Promise<void>;
	setHasCompletedFirstLaunch: (enabled: boolean) => Promise<void>;
	setActiveLibrary: (libraryId: string) => Promise<void>;
	createLibrary: (absolutePath: string) => Promise<string>;
	getActiveLibrary: () => Option<LibraryPath>;
	setHardcoverApiKey: (apiKey: string) => Promise<void>;
	setLastNotifiedUpdateVersion: (version: string | null) => Promise<void>;
}

const setSetting = <K extends SettingsKey>(
	target: SettingsSchema,
	key: K,
	value: SettingsValue<K>,
) => {
	target[key] = value;
};

// Helper to update store and persist to disk
const persistSetting = async <K extends SettingsKey>(
	set: (partial: Partial<SettingsStore>) => void,
	get: () => SettingsStore,
	key: K,
	value: SettingsValue<K>,
) => {
	const { settingsManager } = get();
	if (!settingsManager) {
		throw new Error("Settings manager not initialized");
	}

	// Update store immediately for responsive UI
	set({ [key]: value } as Partial<SettingsStore>);

	// Persist to disk
	await settingsManager.set(key, value);
};

export const useSettings = create<SettingsStore>((set, get) => ({
	...defaultSettings,
	hydrated: false,
	settingsManager: null,

	init: async (settingsManager: SettingsManager) => {
		set({ settingsManager });
		try {
			await settingsManager.initialize();

			// Load all settings from manager
			const initialSettings = {} as SettingsSchema;
			for (const key of Object.keys(defaultSettings) as SettingsKey[]) {
				const value = await settingsManager.get(key);
				setSetting(initialSettings, key, value);
			}

			// Palettes get removed during design iteration; a persisted value
			// from a retired one falls back to the default.
			if (!THEME_PALETTES.includes(initialSettings.themePalette)) {
				initialSettings.themePalette = defaultSettings.themePalette;
				await settingsManager.set("themePalette", defaultSettings.themePalette);
			}

			set({ ...initialSettings, hydrated: true });

			// Mirror changes persisted by other windows (e.g. the Settings
			// window changing theme or the active library) into this window's
			// store. Receiving never re-persists, so there is no echo loop.
			void settingsManager.onChange?.((key, value) => {
				if (Object.is(get()[key], value)) return;
				set({ [key]: value } as Partial<SettingsStore>);
			});
		} catch (e) {
			console.error("Failed to initialize settings:", e);
		}
	},

	setTheme: async (theme) => {
		await persistSetting(set, get, "theme", theme);
	},

	setThemePalette: async (palette) => {
		await persistSetting(set, get, "themePalette", palette);
	},

	setStartFullscreen: async (enabled) => {
		await persistSetting(set, get, "startFullscreen", enabled);
	},

	setAutoUpdateCheckingEnabled: async (enabled) => {
		await persistSetting(set, get, "autoUpdateCheckingEnabled", enabled);
	},

	setHasCompletedFirstLaunch: async (enabled) => {
		await persistSetting(set, get, "hasCompletedFirstLaunch", enabled);
	},

	setActiveLibrary: async (libraryId) => {
		await persistSetting(set, get, "activeLibraryId", libraryId);
	},

	createLibrary: async (absolutePath) => {
		const libraryId = uuidv4();
		const displayName = absolutePath.split("/").at(-1) ?? "";
		const { libraryPaths } = get();

		const wouldBeDuplicate = libraryPaths.find(
			(library) => library.absolutePath === absolutePath,
		);

		if (wouldBeDuplicate) {
			return wouldBeDuplicate.id;
		}

		await persistSetting(set, get, "libraryPaths", [
			...libraryPaths,
			{
				id: libraryId,
				displayName,
				absolutePath,
			},
		]);

		return libraryId;
	},

	getActiveLibrary: () => {
		const { activeLibraryId, libraryPaths } = get();
		const activeLibrary = libraryPaths.find(
			(library) => library.id === activeLibraryId,
		);

		if (activeLibrary === undefined) return none();

		return some(activeLibrary);
	},

	setHardcoverApiKey: async (apiKey) => {
		await persistSetting(set, get, "hardcoverApiKey", apiKey);
	},

	setLastNotifiedUpdateVersion: async (version) => {
		await persistSetting(set, get, "lastNotifiedUpdateVersion", version);
	},
}));

// TODO: Replace this with a proper UUID generator
const uuidv4 = () => {
	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		const v = c === "x" ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
};

// Custom hook - derives Option from primitives to avoid reference equality issues
export const useActiveLibraryPath = (): Option<string> => {
	const activeLibraryId = useSettings((state) => state.activeLibraryId);
	const libraryPaths = useSettings((state) => state.libraryPaths);

	// Derive Option inline - React only re-renders if dependencies change
	if (!activeLibraryId || activeLibraryId.length === 0) {
		return none();
	}

	const activeLibrary = libraryPaths.find(
		(library) => library.id === activeLibraryId,
	);

	if (activeLibrary?.absolutePath) {
		return some(activeLibrary.absolutePath);
	}

	return none();
};
