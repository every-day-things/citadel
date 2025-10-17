import {
	SettingsKey,
	SettingsManager,
	SettingsSchema,
	SettingsValue,
} from "@/lib/settings-manager/types";

export const createWebSettingsManager = (
	defaultSettings: SettingsSchema,
): SettingsManager => {
	return {
		initialize: () => {
			// Set default values for missing keys
			for (const [key, value] of Object.entries(defaultSettings)) {
				if (localStorage.getItem(key) === null) {
					localStorage.setItem(key, JSON.stringify(value));
				}
			}

			// Return fresh values from localStorage
			const initialSettings = {} as SettingsSchema;
			for (const key of Object.keys(defaultSettings) as SettingsKey[]) {
				const item = localStorage.getItem(key);

				const parsed = item
					? (JSON.parse(item) as SettingsValue<typeof key>)
					: defaultSettings[key];

				(initialSettings as Record<string, unknown>)[key] = parsed;
			}

			return Promise.resolve(initialSettings);
		},

		set: <K extends SettingsKey>(key: K, value: SettingsValue<K>) => {
			localStorage.setItem(key, JSON.stringify(value));

			return Promise.resolve();
		},

		get: <K extends SettingsKey>(key: K) => {
			const item = localStorage.getItem(key);

			if (!item) {
				throw new Error(
					`Settings store missing key ${key} -- expected it to have been initialized to default value, at least.`,
				);
			}

			const parsed = JSON.parse(item) as SettingsValue<K>;

			return Promise.resolve(parsed);
		},
	};
};
