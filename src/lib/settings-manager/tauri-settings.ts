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
	const cachedSettings: MutableSettings = {
		...defaultSettings,
	} as MutableSettings;

	return {
		initialize: async () => {
			store = await load("settings.json");

			// Initialize with default values if keys don't exist
			for (const [key, defaultValue] of Object.entries(defaultSettings)) {
				const existingValue = await store.get(key);
				if (existingValue === null || existingValue === undefined) {
					await store.set(key, defaultValue);
				} else {
					// type assertions because I can't figure out how to convince TS
					// that this is right
					(cachedSettings as Record<string, unknown>)[key] = existingValue;
				}
			}

			await store.save();
			return cachedSettings as SettingsSchema;
		},

		set: async <K extends SettingsKey>(key: K, value: SettingsValue<K>) => {
			await store.set(key, value);
			await store.save();

			cachedSettings[key] = value;

			return cachedSettings as SettingsSchema;
		},

		get: async <K extends SettingsKey>(key: K) => {
			const value = await store.get(key);

			return value as SettingsValue<K>;
		},

		settings: cachedSettings as SettingsSchema,
	};
};
