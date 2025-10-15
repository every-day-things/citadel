import { load } from "@tauri-apps/plugin-store";

export const createTauriSettingsManager = <SettingsSchema extends Record<string, unknown>>(defaultSettings: SettingsSchema) => {
	type SettingsKey = keyof SettingsSchema;
	type SettingsValue<K extends SettingsKey> = SettingsSchema[K];

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
