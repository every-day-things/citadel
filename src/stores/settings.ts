import { safeAsyncEventHandler } from "@/lib/async";
import { writable } from "svelte/store";
// TODO: Re-enable when tauri-settings supports Tauri v2
// import {
// 	type ConfigOptions,
// 	SettingsManager as TauriSettingsManager,
// } from "tauri-settings";
// import type { Path, PathValue } from "tauri-settings/dist/types/dot-notation";

// Temporary fallback types and implementation
type ConfigOptions = any;
type Path<_T> = string;
type PathValue<_T, _P> = any;

class TauriSettingsManager {
	constructor(_defaultSettings: any, _config: ConfigOptions) {}
	initialize() {
		return Promise.resolve();
	}
	get(_path: string) {
		return Promise.resolve(null);
	}
	set(_path: string, _value: any) {
		return Promise.resolve();
	}
}
import { type Option, none, some } from "@/lib/option";
import { invoke } from "@tauri-apps/api/core";

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

const genSettingsManager = <T extends SettingsSchema>(
	defaultSettings: T,
	_config: ConfigOptions,
): SettingsManager<T> => {
	try {
		// Check if we're in a Tauri environment by trying to access Tauri API
		if (typeof invoke === "function") {
			// TODO: Re-enable when tauri-settings supports Tauri v2
			// return new TauriSettingsManager(defaultSettings, config);
		}
	} catch {
		// Fall through to browser implementation
	}
	return {
		initialize: () => {
			for (const setting of Object.entries(defaultSettings)) {
				localStorage.setItem(setting[0], setting[1].toString());
			}
			return Promise.resolve({} as T);
		},
		syncCache: () => Promise.resolve({} as T),
		set: (key, value) => {
			localStorage.setItem(key.toString(), String(value));

			return Promise.resolve({} as T);
		},
		get: (key) => {
			return Promise.resolve(
				localStorage.getItem(key.toString()) as PathValue<T, typeof key>,
			);
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
	const manager = genSettingsManager(defaultSettings, {});
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
		set: async <K extends Path<SettingsSchema>>(
			key: K,
			value: PathValue<SettingsSchema, K>,
		) => {
			settings.update((s) => ({ ...s, [key]: value }));
			await manager.set(key, value);
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
