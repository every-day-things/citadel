import { writable } from "svelte/store";
import { type Option, none, some } from "@/lib/option";
import { isTauri } from "@tauri-apps/api/core";
import { createTauriSettingsManager } from "@/lib/settings-manager/tauri-settings";
import { createWebSettingsManager } from "@/lib/settings-manager/web-settings";
import {
	LibraryPath,
	SettingsKey,
	SettingsManager,
	SettingsSchema,
	SettingsValue,
} from "@/lib/settings-manager/types";

let isReady = false;
let resolveSettingsLoaded: () => void;
const settingsLoadedPromise = new Promise<void>((resolve) => {
	resolveSettingsLoaded = resolve;
});

const createSettingsManager = (
	defaultSettings: SettingsSchema,
): SettingsManager => {
	if (isTauri()) {
		return createTauriSettingsManager(defaultSettings);
	}

	return createWebSettingsManager(defaultSettings);
};

const createSettingsStore = () => {
	const defaultSettings: SettingsSchema = {
		theme: "light",
		startFullscreen: false,
		activeLibraryId: "",
		libraryPaths: [],
	};
	const settings = writable<SettingsSchema>();
	const manager = createSettingsManager(defaultSettings);

	manager
		.initialize()
		.then(() => {
			for (const [key, value] of Object.entries(manager.settings)) {
				settings.update((s) => ({ ...s, [key]: value }));
			}
			resolveSettingsLoaded();
			isReady = true;
		})
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
		...existingLibraryPaths,
		{
			id: libraryId,
			displayName,
			absolutePath,
		},
	]);

	return libraryId;
};

export const waitForSettings = () => settingsLoadedPromise;
export const settings = createSettingsStore();
export const isSettingsReady = () => isReady;

export const setActiveLibrary = async (
	store: typeof settings,
	libraryId: string,
): Promise<void> => {
	await store.set("activeLibraryId", libraryId);

	return;
};

export const getActiveLibrary = async (
	store: typeof settings,
): Promise<Option<LibraryPath>> => {
	const activeLibraryId = await store.get("activeLibraryId");
	const libraryPaths = await store.get("libraryPaths");
	const activeLibrary = libraryPaths.find(
		(library) => library.id === activeLibraryId,
	);

	if (activeLibrary === undefined) return none();

	return some(activeLibrary);
};
