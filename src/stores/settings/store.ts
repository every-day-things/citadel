import type { Option } from "@/lib/option";
import { none, some } from "@/lib/option";
import { createTauriSettingsManager } from "@/lib/settings-manager/tauri-settings";
import { createWebSettingsManager } from "@/lib/settings-manager/web-settings";
import type {
	SettingsKey,
	SettingsManager,
	SettingsSchema,
	SettingsValue,
} from "@/lib/settings-manager/types";
import { isTauri } from "@tauri-apps/api/core";
import { create } from "zustand";

interface SettingsStore extends SettingsSchema {
	hydrated: boolean;
	init: () => Promise<void>;
	set: <K extends SettingsKey>(
		key: K,
		value: SettingsValue<K>,
	) => Promise<void>;
	get: <K extends SettingsKey>(key: K) => Promise<SettingsValue<K>>;
}

const defaultSettings: SettingsSchema = {
	theme: "light",
	startFullscreen: false,
	activeLibraryId: "",
	libraryPaths: [],
};

const createSettingsManager = (
	defaultSettings: SettingsSchema,
): SettingsManager => {
	if (isTauri()) {
		return createTauriSettingsManager(defaultSettings);
	}

	return createWebSettingsManager(defaultSettings);
};

const manager = createSettingsManager(defaultSettings);

export const useSettings = create<SettingsStore>((set) => ({
	...defaultSettings,
	hydrated: false,

	init: async () => {
		try {
			await manager.initialize();

			// Load all settings from manager
			const initialSettings = {} as SettingsSchema;
			for (const key of Object.keys(defaultSettings) as SettingsKey[]) {
				const value = await manager.get(key);
				(initialSettings as Record<string, unknown>)[key] = value;
			}

			set({ ...initialSettings, hydrated: true });
		} catch (e) {
			console.error("Failed to initialize settings:", e);
		}
	},

	set: async <K extends SettingsKey>(key: K, value: SettingsValue<K>) => {
		// Update store immediately for responsive UI
		set({ [key]: value } as Partial<SettingsStore>);

		// Persist to disk
		await manager.set(key, value);
	},

	get: async <K extends SettingsKey>(key: K) => {
		return manager.get(key);
	},
}));

// Auto-initialize the store when module loads
void useSettings.getState().init();


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
