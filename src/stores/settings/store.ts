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

	// Lifecycle
	init: () => Promise<void>;

	// Domain-specific actions
	setTheme: (theme: "dark" | "light" | "auto") => Promise<void>;
	setStartFullscreen: (enabled: boolean) => Promise<void>;
	setActiveLibrary: (libraryId: string) => Promise<void>;
	createLibrary: (absolutePath: string) => Promise<string>;
	getActiveLibrary: () => Option<
		import("@/lib/settings-manager/types").LibraryPath
	>;
}

const defaultSettings: SettingsSchema = {
	theme: "auto",
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

// Helper to update store and persist to disk
const persistSetting = async <K extends SettingsKey>(
	set: (partial: Partial<SettingsStore>) => void,
	key: K,
	value: SettingsValue<K>,
) => {
	// Update store immediately for responsive UI
	set({ [key]: value } as Partial<SettingsStore>);

	// Persist to disk
	await manager.set(key, value);
};

export const useSettings = create<SettingsStore>((set, get) => ({
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

	setTheme: async (theme) => {
		await persistSetting(set, "theme", theme);
	},

	setStartFullscreen: async (enabled) => {
		await persistSetting(set, "startFullscreen", enabled);
	},

	setActiveLibrary: async (libraryId) => {
		await persistSetting(set, "activeLibraryId", libraryId);
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

		await persistSetting(set, "libraryPaths", [
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
