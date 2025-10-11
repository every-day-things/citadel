import { safeAsyncEventHandler } from "@/lib/async";
import { writable } from "svelte/store";
import { type Option, none, some } from "@/lib/option";
import { invoke } from "@tauri-apps/api/core";
import { readTextFile, writeTextFile, exists, BaseDirectory } from "@tauri-apps/plugin-fs";

type Path<_T> = string;
type PathValue<_T, _P> = any;

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

interface SettingsManager<T> {
	initialize: () => Promise<T>;
	set: <S extends Path<T>>(key: S, value: PathValue<T, S>) => Promise<T>;
	get: <S extends Path<T>>(key: S) => Promise<PathValue<T, S>>;
	syncCache: () => Promise<T>;
	settings: T;
}

let isReady = false;
let resolveSettingsLoaded: () => void;
const settingsLoadedPromise = new Promise<void>((resolve) => {
	resolveSettingsLoaded = resolve;
});

const SETTINGS_FILE = "settings.json";

const genSettingsManager = <T extends SettingsSchema>(
	defaultSettings: T,
): SettingsManager<T> => {
	let currentSettings = { ...defaultSettings };
	let isInitialized = false;

	const loadFromFile = async (): Promise<T> => {
		console.log("Loading settings - forcing localStorage for testing");
		
		// Force localStorage for now to debug the issue
		for (const [key, defaultValue] of Object.entries(defaultSettings)) {
			const stored = localStorage.getItem(key);
			if (stored !== null && stored !== "") {
				try {
					const parsed = JSON.parse(stored);
					currentSettings[key as keyof T] = parsed;
					console.log(`Loaded ${key} from localStorage:`, parsed);
				} catch {
					// For backwards compatibility, handle string values
					if (key === "libraryPaths" && stored === "") {
						currentSettings[key as keyof T] = [] as any;
					} else {
						currentSettings[key as keyof T] = stored as any;
					}
					console.log(`Loaded ${key} from localStorage (string):`, stored);
				}
			} else {
				(currentSettings as any)[key] = defaultValue;
				console.log(`Using default for ${key}:`, defaultValue);
			}
		}
		console.log("Final loaded settings:", currentSettings);
		return currentSettings;
	};

	const saveToFile = async (): Promise<void> => {
		console.log("Saving settings - forcing localStorage for testing:", currentSettings);
		
		// Force localStorage for now to debug the issue
		for (const [key, value] of Object.entries(currentSettings)) {
			localStorage.setItem(key, JSON.stringify(value));
			console.log(`Saved ${key} to localStorage:`, value);
		}
	};

	return {
		initialize: async () => {
			if (!isInitialized) {
				currentSettings = await loadFromFile();
				isInitialized = true;
			}
			return currentSettings;
		},
		syncCache: () => Promise.resolve(currentSettings),
		set: async (key, value) => {
			currentSettings[key as keyof T] = value as any;
			await saveToFile();
			return currentSettings;
		},
		get: (key) => {
			return Promise.resolve(currentSettings[key as keyof T] as PathValue<T, typeof key>);
		},
		settings: currentSettings,
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
	const settings = writable<SettingsSchema>(defaultSettings);
	const manager = genSettingsManager(defaultSettings);
	manager
		.initialize()
		.then((initializedSettings) => {
			console.log('Settings loaded:', initializedSettings);
			if (!initializedSettings) {
				console.error('Settings initialization returned undefined, using defaults');
				settings.update(() => defaultSettings);
			} else {
				// Update the store with the loaded settings
				settings.update(() => initializedSettings as SettingsSchema);
			}
			resolveSettingsLoaded();
			isReady = true;
		})
		.catch((e) => {
			console.error('Settings initialization failed:', e);
			// Ensure we still mark as ready with defaults
			settings.update(() => defaultSettings);
			resolveSettingsLoaded();
			isReady = true;
		});

	return {
		set: async <K extends Path<SettingsSchema>>(
			key: K,
			value: PathValue<SettingsSchema, K>,
		) => {
			try {
				console.log('Setting:', key, 'to:', value);
				const updatedSettings = await manager.set(key, value);
				console.log('Updated settings:', updatedSettings);
				// Update the store with the updated settings
				settings.update(() => updatedSettings as SettingsSchema);
			} catch (e) {
				console.error('Failed to set setting:', key, value, e);
				throw e;
			}
		},
		get: <S extends Path<SettingsSchema>>(key: S) => {
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
		(library: LibraryPath) => library.absolutePath === absolutePath,
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
): Promise<Option<SettingsSchema["libraryPaths"][number]>> => {
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

	const activeLibrary = (await store.get("libraryPaths")).find(
		(library: LibraryPath) => library.id === activeLibraryId,
	);
	if (activeLibrary !== undefined) return some(activeLibrary);

	return none();
};
