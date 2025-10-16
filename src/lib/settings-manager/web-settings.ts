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
			for (const [key, value] of Object.entries(defaultSettings)) {
				if (localStorage.getItem(key) === null) {
					localStorage.setItem(key, JSON.stringify(value));
				}
			}
			return Promise.resolve(defaultSettings);
		},

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
