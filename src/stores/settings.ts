import { safeAsyncEventHandler } from "@/lib/async";
import { writable } from "svelte/store";
import { load } from "@tauri-apps/plugin-store";
import { type Option, none, some } from "@/lib/option";
import { isTauri } from "@tauri-apps/api/core";

export interface LibraryPath {
	id: string;
	displayName: string;
	absolutePath: string;
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type SettingsSchema = {
	theme: "dark" | "light";
	startFullscreen: boolean;
	activeLibraryId: string;
	libraryPaths: LibraryPath[];
	// @deprecated Use `activeLibraryId` and `libraryPaths` instead
	calibreLibraryPath: string;
};

type SettingsKey = keyof SettingsSchema;
type SettingsValue<K extends SettingsKey> = SettingsSchema[K];

interface SettingsManager {
	initialize: () => Promise<SettingsSchema>;
	set: <K extends SettingsKey>(
		key: K,
		value: SettingsValue<K>,
	) => Promise<SettingsSchema>;
	get: <K extends SettingsKey>(key: K) => Promise<SettingsValue<K>>;
	syncCache: () => Promise<SettingsSchema>;
	settings: SettingsSchema;
}

let isReady = false;
let resolveSettingsLoaded: () => void;
const settingsLoadedPromise = new Promise<void>((resolve) => {
	resolveSettingsLoaded = resolve;
});

const genSettingsManager = (
	defaultSettings: SettingsSchema,
): SettingsManager => {
	// Check if running in Tauri environment
	if (isTauri()) {
		let store: Awaited<ReturnType<typeof load>>;
		const cachedSettings: SettingsSchema = { ...defaultSettings };

		return {
			initialize: async () => {
				store = await load("settings.json");

				// Initialize with default values if keys don't exist
				for (const [key, defaultValue] of Object.entries(defaultSettings)) {
					const existingValue = await store.get(key);
					if (existingValue === null || existingValue === undefined) {
						await store.set(key, defaultValue);
					} else {
						(cachedSettings as Record<string, unknown>)[key] = existingValue;
					}
				}

				await store.save();
				return cachedSettings;
			},
			syncCache: async () => {
				const entries = await store.entries();

				// Update cached settings with all entries from store
				for (const [key, value] of entries) {
					if (key in defaultSettings) {
						(cachedSettings as Record<string, unknown>)[key] = value;
					}
				}

				return cachedSettings;
			},
			set: async <K extends SettingsKey>(key: K, value: SettingsValue<K>) => {
				await store.set(key, value);
				await store.save();
				(cachedSettings as Record<string, unknown>)[key] = value;
				return cachedSettings;
			},
			get: async <K extends SettingsKey>(key: K) => {
				const value = await store.get(key);
				return value as SettingsValue<K>;
			},
			settings: cachedSettings,
		};
	}

	// Fallback for non-Tauri environments (web/testing)
	return {
		initialize: () => {
			for (const [key, value] of Object.entries(defaultSettings)) {
				if (localStorage.getItem(key) === null) {
					localStorage.setItem(key, JSON.stringify(value));
				}
			}
			return Promise.resolve(defaultSettings);
		},
		syncCache: () => Promise.resolve(defaultSettings),
		set: <K extends SettingsKey>(key: K, value: SettingsValue<K>) => {
			localStorage.setItem(key, JSON.stringify(value));
			return Promise.resolve(defaultSettings);
		},
		get: <K extends SettingsKey>(key: K) => {
			const item = localStorage.getItem(key);
			const parsed = item
				? (JSON.parse(item) as SettingsValue<K>)
				: defaultSettings[key];
			return Promise.resolve(parsed);
		},
		settings: defaultSettings,
	};
};

const createSettingsStore = () => {
	const defaultSettings: SettingsSchema = {
		theme: "light",
		startFullscreen: false,
		// @deprecated Use `activeLibraryId` and `libraryPaths` instead
		calibreLibraryPath: "",
		activeLibraryId: "",
		libraryPaths: [],
	};
	const settings = writable<SettingsSchema>();
	const manager = genSettingsManager(defaultSettings);
	manager
		.initialize()
		.then(
			safeAsyncEventHandler(async () => {
				await manager.syncCache();
				for (const [key, value] of Object.entries(manager.settings)) {
					settings.update((s) => ({ ...s, [key]: value }));
				}
				resolveSettingsLoaded();
				isReady = true;
			}),
		)
		.catch((e) => {
			console.error(e);
		});

	return {
		set: async <K extends SettingsKey>(key: K, value: SettingsValue<K>) => {
			settings.update((s) => ({ ...s, [key]: value }));
			await manager.set(key, value);
		},
		get: <K extends SettingsKey>(key: K) => {
			return manager.get(key);
		},
		subscribe: settings.subscribe,
	};
};

export const waitForSettings = () => settingsLoadedPromise;
export const settings = createSettingsStore();
export const isSettingsReady = () => isReady;

// TODO: Replace this with a proper UUID generator
const uuidv4 = () => {
	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		const v = c === "x" ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
};

export const createSettingsLibrary = async (
	store: typeof settings,
	absolutePath: string,
): Promise<string> => {
	const libraryId = uuidv4();
	const displayName = absolutePath.split("/").at(-1) ?? "";
	const existingLibraryPaths = (await store.get("libraryPaths")) ?? [];

	const wouldBeDuplicate = existingLibraryPaths.find(
		(library) => library.absolutePath === absolutePath,
	);

	if (wouldBeDuplicate) {
		return wouldBeDuplicate.id;
	}

	await store.set("libraryPaths", [
		...(await store.get("libraryPaths")),
		{
			id: libraryId,
			displayName,
			absolutePath,
		},
	]);

	return libraryId;
};

export const setActiveLibrary = async (
	store: typeof settings,
	libraryId: string,
): Promise<void> => {
	await store.set("activeLibraryId", libraryId);

	return;
};

const isActiveLibraryIdSet = (libraryId: string) => {
	return libraryId.length > 0;
};

export const getActiveLibrary = async (
	store: typeof settings,
): Promise<Option<LibraryPath>> => {
	const activeLibraryId = await store.get("activeLibraryId");

	// Support one-time migration from old schema
	const calibreLibraryPath = (await settings.get("calibreLibraryPath")) ?? "";
	if (!isActiveLibraryIdSet(activeLibraryId) && calibreLibraryPath.length > 0) {
		const newLibraryId = await createSettingsLibrary(
			settings,
			calibreLibraryPath,
		);
		await setActiveLibrary(settings, newLibraryId);
		await settings.set("calibreLibraryPath", "");
	} else if (!isActiveLibraryIdSet(activeLibraryId)) {
		return none();
	}

	const libraryPaths = await store.get("libraryPaths");
	const activeLibrary = libraryPaths.find(
		(library) => library.id === activeLibraryId,
	);

	if (activeLibrary !== undefined) return some(activeLibrary);

	return none();
};
