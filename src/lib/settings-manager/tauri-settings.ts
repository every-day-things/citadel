import {
	SettingsKey,
	SettingsManager,
	SettingsSchema,
	SettingsValue,
} from "@/lib/settings-manager/types";
import { load } from "@tauri-apps/plugin-store";

export const createTauriSettingsManager = (
	defaultSettings: SettingsSchema,
): SettingsManager => {
	type MutableSettings = {
		-readonly [K in keyof SettingsSchema]: SettingsSchema[K];
	};

	let store: Awaited<ReturnType<typeof load>>;
	return {
		initialize: async () => {
			store = await load("settings.json");

			// Initialize with default values if keys don't exist
			for (const [key, defaultValue] of Object.entries(defaultSettings)) {
				const existingValue = await store.get(key);
				if (existingValue === null || existingValue === undefined) {
					await store.set(key, defaultValue);
				}
			}

			await store.save();

			// Return fresh values from store
			const initialSettings = {} as MutableSettings;
			for (const key of Object.keys(defaultSettings)) {
				const value = await store.get(key);
				(initialSettings as Record<string, unknown>)[key] = value;
			}
			return initialSettings as SettingsSchema;
		},

		set: async <K extends SettingsKey>(key: K, value: SettingsValue<K>) => {
			await store.set(key, value);
			await store.save();
		},

		get: async <K extends SettingsKey>(key: K) => {
			const value = await store.get(key);

			return value as SettingsValue<K>;
		},
	};
};
